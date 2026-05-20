/**
 * Jira integration extension for pi
 *
 * Provides:
 *   - `jira_ticket` tool: fetch ticket details
 *   - `jira_create_subtask` tool: create sub-tasks
 *   - `jira_transition` tool: move tickets between statuses
 *   - `/ticket` command: load a ticket, set up a branch, and start planning
 *   - `/ship` command: stage, commit, push, open PR, move to Code Review
 *
 * Required env vars:
 *   JIRA_BASE_URL   - e.g. https://forgeholidays.atlassian.net
 *   JIRA_EMAIL      - your Atlassian email
 *   JIRA_API_TOKEN  - Atlassian API token
 *
 * Optional env vars:
 *   JIRA_BOARD_ID       - board ID for sprint lookup (default: 275)
 *   JIRA_SUBTASK_TYPE   - issue type ID for sub-tasks (default: 5)
 *   JIRA_ASSIGNEE_ID    - account ID to auto-assign sub-tasks to
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

// ── Configuration ─────────────────────────────────────────────────────────────

const BOARD_ID = process.env.JIRA_BOARD_ID ?? "275";
const SUBTASK_TYPE_ID = process.env.JIRA_SUBTASK_TYPE ?? "5";
const ASSIGNEE_ACCOUNT_ID =
  process.env.JIRA_ASSIGNEE_ID ?? "712020:a73621b6-1c28-46b9-815a-d5cd8da82987";

// ── Types ─────────────────────────────────────────────────────────────────────

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: unknown;
    status: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string; emailAddress: string } | null;
    reporter?: { displayName: string; emailAddress: string } | null;
    issuetype?: { name: string };
    labels?: string[];
    created?: string;
    updated?: string;
    parent?: { key: string; fields?: { summary: string } };
    subtasks?: Array<{
      key: string;
      fields: { summary: string; status: { name: string } };
    }>;
    comment?: {
      comments: Array<{
        author: { displayName: string };
        body: unknown;
        created: string;
      }>;
    };
    [key: string]: unknown;
  };
}

interface JiraSprint {
  id: number;
  name: string;
  state: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getConfig() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    const missing = [
      !baseUrl && "JIRA_BASE_URL",
      !email && "JIRA_EMAIL",
      !token && "JIRA_API_TOKEN",
    ].filter(Boolean);
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. ` +
        "Set them in your shell config (~/.zshrc)."
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), email, token };
}

function authHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

function headers(email: string, token: string): Record<string, string> {
  return {
    Authorization: authHeader(email, token),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * Recursively extract plain text from Atlassian Document Format (ADF).
 */
function adfToText(node: unknown, depth = 0): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  if (n.type === "text" && typeof n.text === "string") {
    return n.text;
  }

  if (Array.isArray(n.content)) {
    const parts = (n.content as unknown[]).map((child) =>
      adfToText(child, depth + 1)
    );
    const joined = parts.join("");

    switch (n.type) {
      case "paragraph":
        return joined + "\n\n";
      case "heading": {
        const level = (n.attrs as Record<string, unknown>)?.level ?? 1;
        return "#".repeat(Number(level)) + " " + joined + "\n\n";
      }
      case "bulletList":
      case "orderedList":
        return joined + "\n";
      case "listItem":
        return (
          "  ".repeat(Math.max(0, depth - 1)) +
          "• " +
          joined.trim() +
          "\n"
        );
      case "blockquote":
        return (
          joined
            .split("\n")
            .map((l: string) => "> " + l)
            .join("\n") + "\n"
        );
      case "codeBlock":
        return "```\n" + joined + "\n```\n\n";
      default:
        return joined;
    }
  }

  return "";
}

function formatDescription(description: unknown): string {
  if (!description) return "(no description)";
  if (typeof description === "string") return description;
  const text = adfToText(description).trim();
  return text || "(no description)";
}

// ── Jira API ──────────────────────────────────────────────────────────────────

async function fetchIssue(key: string): Promise<JiraIssue> {
  const { baseUrl, email, token } = getConfig();
  const url =
    `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}` +
    `?fields=summary,description,status,priority,assignee,reporter,issuetype,labels,created,updated,parent,subtasks,comment`;

  const res = await fetch(url, { headers: headers(email, token) });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404) throw new Error(`Ticket ${key} not found.`);
    if (res.status === 401)
      throw new Error(
        "Jira authentication failed. Check JIRA_EMAIL and JIRA_API_TOKEN."
      );
    if (res.status === 403)
      throw new Error(
        `No permission to view ${key}. Check your Jira API token scopes.`
      );
    throw new Error(`Jira API error ${res.status}: ${body}`);
  }

  return (await res.json()) as JiraIssue;
}

async function fetchActiveSprint(): Promise<JiraSprint | null> {
  const { baseUrl, email, token } = getConfig();
  const url = `${baseUrl}/rest/agile/1.0/board/${BOARD_ID}/sprint?state=active`;

  const res = await fetch(url, { headers: headers(email, token) });
  if (!res.ok) return null;

  const data = (await res.json()) as { values: JiraSprint[] };
  return data.values?.[0] ?? null;
}

async function getProjectKey(parentKey: string): Promise<string> {
  const match = parentKey.match(/^([A-Z]+)-\d+$/);
  if (!match) throw new Error(`Invalid issue key format: ${parentKey}`);
  return match[1];
}

async function createSubtask(
  parentKey: string,
  summary: string
): Promise<JiraIssue> {
  const { baseUrl, email, token } = getConfig();
  const projectKey = await getProjectKey(parentKey);

  const sprint = await fetchActiveSprint();

  const payload: Record<string, unknown> = {
    fields: {
      project: { key: projectKey },
      parent: { key: parentKey },
      summary: `${parentKey}: ${summary}`,
      issuetype: { id: SUBTASK_TYPE_ID },
      assignee: { accountId: ASSIGNEE_ACCOUNT_ID },
    },
  };

  const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: headers(email, token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create sub-task: ${res.status} ${body}`);
  }

  const created = (await res.json()) as { key: string; id: string };

  if (sprint) {
    const sprintRes = await fetch(
      `${baseUrl}/rest/agile/1.0/sprint/${sprint.id}/issue`,
      {
        method: "POST",
        headers: headers(email, token),
        body: JSON.stringify({ issues: [created.key] }),
      }
    );
    if (!sprintRes.ok) {
      const sprintBody = await sprintRes.text().catch(() => "");
      console.warn(
        `Sub-task created but failed to move to sprint: ${sprintRes.status} ${sprintBody}`
      );
    }
  }

  await transitionToInProgress(created.key);

  return fetchIssue(created.key);
}

async function transitionToInProgress(issueKey: string): Promise<void> {
  const { baseUrl, email, token } = getConfig();
  const url = `${baseUrl}/rest/api/3/issue/${issueKey}/transitions`;

  const res = await fetch(url, { headers: headers(email, token) });
  if (!res.ok) return;

  const data = (await res.json()) as {
    transitions: Array<{ id: string; name: string; to: { name: string } }>;
  };
  const transition = data.transitions.find((t) => t.to.name === "In Progress");
  if (!transition) return;

  await fetch(url, {
    method: "POST",
    headers: headers(email, token),
    body: JSON.stringify({ transition: { id: transition.id } }),
  });
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatIssue(issue: JiraIssue): string {
  const f = issue.fields;
  const lines: string[] = [];

  lines.push(`# ${issue.key}: ${f.summary}`);
  lines.push("");
  lines.push(`**Type:** ${f.issuetype?.name ?? "Unknown"}`);
  lines.push(`**Status:** ${f.status.name}`);
  if (f.priority) lines.push(`**Priority:** ${f.priority.name}`);
  if (f.assignee) lines.push(`**Assignee:** ${f.assignee.displayName}`);
  if (f.reporter) lines.push(`**Reporter:** ${f.reporter.displayName}`);
  if (f.labels?.length) lines.push(`**Labels:** ${f.labels.join(", ")}`);
  if (f.parent)
    lines.push(
      `**Parent:** ${f.parent.key}${f.parent.fields ? ` — ${f.parent.fields.summary}` : ""}`
    );
  lines.push("");

  lines.push("## Description");
  lines.push("");
  lines.push(formatDescription(f.description));

  if (f.subtasks?.length) {
    lines.push("");
    lines.push("## Subtasks");
    for (const sub of f.subtasks) {
      const icon = sub.fields.status.name === "Done" ? "✅" : "⬜";
      lines.push(
        `${icon} ${sub.key}: ${sub.fields.summary} (${sub.fields.status.name})`
      );
    }
  }

  if (f.comment?.comments?.length) {
    lines.push("");
    lines.push("## Comments");
    const recent = f.comment.comments.slice(-5);
    for (const c of recent) {
      const date = new Date(c.created).toLocaleDateString();
      lines.push("");
      lines.push(`**${c.author.displayName}** (${date}):`);
      lines.push(adfToText(c.body).trim());
    }
  }

  return lines.join("\n");
}

// ── Extension ─────────────────────────────────────────────────────────────────

export default function jiraExtension(pi: ExtensionAPI) {
  // ── jira_ticket tool ──────────────────────────────────────────────────────

  pi.registerTool({
    name: "jira_ticket",
    label: "Jira Ticket",
    description:
      "Fetch a Jira ticket's details including summary, description, status, assignee, subtasks, and recent comments. " +
      "Use this when you need to understand what a ticket requires before starting work.",
    promptSnippet:
      "Fetch Jira ticket details (summary, description, status, comments)",
    promptGuidelines: [
      "Use jira_ticket to fetch ticket details when the user mentions a Jira ticket key like PHOEN-123",
      "After fetching a ticket with jira_ticket, also call set_context to track it in the footer",
    ],
    parameters: Type.Object({
      key: Type.String({
        description: 'Jira issue key, e.g. "PHOEN-123"',
      }),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const key = params.key.toUpperCase().trim();
      const issue = await fetchIssue(key);
      const formatted = formatIssue(issue);
      const { baseUrl } = getConfig();

      return {
        content: [{ type: "text", text: formatted }],
        details: {
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          url: `${baseUrl}/browse/${issue.key}`,
        },
      };
    },
  });

  // ── jira_create_subtask tool ──────────────────────────────────────────────

  pi.registerTool({
    name: "jira_create_subtask",
    label: "Create Jira Sub-task",
    description:
      "Create a sub-task under a parent Jira ticket. The sub-task is automatically assigned, " +
      "added to the current sprint, and carries no story points. " +
      "The summary is prefixed with the parent ticket key automatically.",
    promptSnippet: "Create a Jira sub-task under a parent ticket",
    promptGuidelines: [
      "Use jira_create_subtask to break parent tickets into focused sub-tasks before starting work",
      "Each sub-task should map to a single PR — keep the summary short and descriptive",
      "Do not include the parent ticket key in the summary — it is added automatically",
    ],
    parameters: Type.Object({
      parentKey: Type.String({
        description: 'The parent ticket key, e.g. "PHOEN-2328"',
      }),
      summary: Type.String({
        description:
          'Short description of the sub-task, e.g. "Make carousel description field optional"',
      }),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const parentKey = params.parentKey.toUpperCase().trim();
      const issue = await createSubtask(parentKey, params.summary);
      const { baseUrl } = getConfig();

      return {
        content: [
          {
            type: "text",
            text:
              `Created sub-task **${issue.key}**: ${issue.fields.summary}\n\n` +
              `**Status:** ${issue.fields.status.name}\n` +
              `**Assignee:** ${issue.fields.assignee?.displayName ?? "Unassigned"}\n` +
              `**URL:** ${baseUrl}/browse/${issue.key}`,
          },
        ],
        details: {
          key: issue.key,
          summary: issue.fields.summary,
          parentKey,
          url: `${baseUrl}/browse/${issue.key}`,
        },
      };
    },
  });

  // ── jira_transition tool ──────────────────────────────────────────────────

  pi.registerTool({
    name: "jira_transition",
    label: "Transition Jira Ticket",
    description:
      "Move a Jira ticket to a different status (e.g. 'Code Review', 'In Progress', 'Done'). " +
      "Use this after raising a PR to move the ticket to Code Review.",
    promptSnippet: "Transition a Jira ticket to a new status",
    promptGuidelines: [
      "Use jira_transition to move tickets to 'Code Review' after raising a PR",
      "Use jira_transition to move tickets to 'In Progress' when starting work",
    ],
    parameters: Type.Object({
      key: Type.String({
        description: 'Jira issue key, e.g. "PHOEN-2342"',
      }),
      status: Type.String({
        description:
          'Target status name, e.g. "Code Review", "In Progress", "Done"',
      }),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const { baseUrl, email, token } = getConfig();
      const key = params.key.toUpperCase().trim();
      const url = `${baseUrl}/rest/api/3/issue/${key}/transitions`;

      const res = await fetch(url, { headers: headers(email, token) });
      if (!res.ok) {
        throw new Error(
          `Failed to fetch transitions for ${key}: ${res.status}`
        );
      }

      const data = (await res.json()) as {
        transitions: Array<{
          id: string;
          name: string;
          to: { name: string };
        }>;
      };

      const target = params.status.toLowerCase();
      const transition = data.transitions.find(
        (t) =>
          t.to.name.toLowerCase() === target ||
          t.name.toLowerCase() === target
      );

      if (!transition) {
        const available = data.transitions.map((t) => t.to.name).join(", ");
        throw new Error(
          `No transition to "${params.status}" found for ${key}. Available: ${available}`
        );
      }

      const applyRes = await fetch(url, {
        method: "POST",
        headers: headers(email, token),
        body: JSON.stringify({ transition: { id: transition.id } }),
      });

      if (!applyRes.ok) {
        const body = await applyRes.text().catch(() => "");
        throw new Error(
          `Failed to transition ${key}: ${applyRes.status} ${body}`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Moved **${key}** to **${transition.to.name}**.`,
          },
        ],
        details: { key, status: transition.to.name },
      };
    },
  });

  // ── /ticket command ───────────────────────────────────────────────────────

  pi.registerCommand("ticket", {
    description:
      "Load a Jira ticket, set up a branch, and start planning (e.g. /ticket PHOEN-123 [subtask summary])",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify(
          "Usage: /ticket PHOEN-123 [optional subtask summary]",
          "error"
        );
        return;
      }

      const parts = args.trim().split(/\s+/);
      const rawKey = parts[0];
      const key = /^\d+$/.test(rawKey)
        ? `PHOEN-${rawKey}`
        : rawKey.toUpperCase();
      const subtaskSummary = parts.slice(1).join(" ");

      const subtaskInstruction = subtaskSummary
        ? `Create a subtask immediately with jira_create_subtask using "${subtaskSummary}" as the summary. Use the resulting subtask key going forward. Update the footer with the subtask link.`
        : `No subtask summary was provided — work directly against ${key}.`;

      pi.sendUserMessage(
        `Load ticket ${key}. Work through each step in order.

## 1. Load the Ticket

Fetch ${key} with jira_ticket and show:
- Title, status, description
- Any existing subtasks and their statuses
- Any linked tickets or blockers

Update the footer with set_context (ticket link).

## 2. Subtask

${subtaskInstruction}

## 3. Branch Setup

Check the current branch (git branch --show-current).
The correct branch name format is: PHOEN-XXXX-short-description

If already on the correct branch: confirm and move on.
If on a different branch or on main:
1. Stash uncommitted changes: git stash push -m "ticket: pre-branch stash"
2. Switch to main and pull: git checkout main && git pull
3. Create the new branch: git checkout -b PHOEN-XXXX-short-description
4. If stash was made, pop it: git stash pop — confirm it applied cleanly.

## 4. Planning

Invoke the planning skill to turn the ticket requirements into a design before any code is written. Before asking any questions, explore relevant project context using parallel subagents. Follow the full planning process through to an approved design and written spec.`
      );
    },
  });

  // ── /ship command ─────────────────────────────────────────────────────────

  pi.registerCommand("ship", {
    description: "Stage, commit and open a PR (e.g. /ship [PHOEN-XXXX])",
    handler: async (args, _ctx) => {
      const rawKey = args?.trim() ?? "";
      const keyInstruction = rawKey
        ? `The ticket key is ${/^\d+$/.test(rawKey) ? `PHOEN-${rawKey}` : rawKey.toUpperCase()}.`
        : `Check the current branch name for a PHOEN-XXXX prefix and use that. If no information is available, ask which ticket this work belongs to.`;

      pi.sendUserMessage(
        `Walk through the full ship checklist for the current working changes. Follow each step in order and stop to confirm before destructive git operations.

## Ticket / Subtask

1. Identify the relevant Jira ticket: ${keyInstruction}

2. Fetch the ticket with jira_ticket and show its title and status.

3. Decide whether a subtask is needed:
   - If the changes represent the whole ticket's scope, work against the parent ticket.
   - If the changes are a focused slice of a larger ticket, create a subtask with jira_create_subtask. Use the resulting subtask key going forward.

4. Update the footer context with set_context (ticket link).

## Branch

5. Check the current branch (git branch --show-current).

6. The correct branch name format is PHOEN-XXXX-short-description where PHOEN-XXXX is the ticket or subtask key and the description is a few hyphenated lowercase words.

7. If the current branch already matches this format for the correct ticket, stay on it.

8. If the branch is wrong or is main:
   a. Stash uncommitted changes: git stash push -m "ship: pre-branch stash"
   b. Switch to main and pull: git checkout main && git pull
   c. Create the new branch: git checkout -b PHOEN-XXXX-short-description
   d. Pop the stash: git stash pop
   e. Confirm the stash applied cleanly before continuing.

## Stage & Commit

9. Show the current diff (git diff and git status).

10. Stage the relevant files. If there are unrelated changes in the working tree, ask which files to include.

11. Commit using this format exactly:
    PHOEN-XXXX short description of what this commit does
    The PHOEN-XXXX should match the ticket/subtask number.

## Pull Request

12. Push the branch: git push -u origin <branch>.

13. Open a PR with gh pr create using:
    - Title: PHOEN-XXXX Short description
    - Body:
      ## Summary
      <2-3 bullet points of what changed and why; leave out implementation details>

      ## Testing
      - [ ] <key thing to verify manually>
      - [ ] <regression check if applicable>

      Jira: [PHOEN-XXXX](https://forgeholidays.atlassian.net/browse/PHOEN-XXXX)

14. Report the PR URL and update the footer mr context with the link.

## Update Jira

15. Move the Jira ticket to Code Review using jira_transition.`
      );
    },
  });
}
