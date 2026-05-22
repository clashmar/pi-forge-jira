import { getConfig, headers, BOARD_ID, SUBTASK_TYPE_ID, ASSIGNEE_ACCOUNT_ID } from "./config";
import { textToAdf } from "./adf";
import type { JiraIssue, JiraSprint } from "./types";

export async function fetchIssue(key: string): Promise<JiraIssue> {
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

export async function fetchActiveSprint(): Promise<JiraSprint | null> {
  const { baseUrl, email, token } = getConfig();
  const url = `${baseUrl}/rest/agile/1.0/board/${BOARD_ID}/sprint?state=active`;

  const res = await fetch(url, { headers: headers(email, token) });
  if (!res.ok) return null;

  const data = (await res.json()) as { values: JiraSprint[] };
  return data.values?.[0] ?? null;
}

export async function getProjectKey(parentKey: string): Promise<string> {
  const match = parentKey.match(/^([A-Z]+)-\d+$/);
  if (!match) throw new Error(`Invalid issue key format: ${parentKey}`);
  return match[1];
}

/** Resolve email → accountId via user search; pass through non-email strings as accountId. */
export async function resolveAssignee(
  assignee: string,
  baseUrl: string,
  email: string,
  token: string
): Promise<string> {
  if (!assignee.includes("@")) {
    return assignee; // already an accountId
  }

  const url = `${baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(assignee)}`;
  const res = await fetch(url, { headers: headers(email, token) });

  if (!res.ok) {
    throw new Error(`Failed to search for user "${assignee}": ${res.status}`);
  }

  const users = (await res.json()) as Array<{
    accountId: string;
    displayName: string;
  }>;

  if (!users.length) {
    throw new Error(`Could not find Jira user with email ${assignee}`);
  }

  return users[0].accountId;
}

export async function transitionToInProgress(issueKey: string): Promise<void> {
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

export async function createSubtask(
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

/** Transition a Jira issue to a named status. Returns the status name actually applied. */
export async function transitionIssue(
  key: string,
  targetStatus: string
): Promise<{ transitionedTo: string }> {
  const { baseUrl, email, token } = getConfig();
  const url = `${baseUrl}/rest/api/3/issue/${key}/transitions`;

  const res = await fetch(url, { headers: headers(email, token) });
  if (!res.ok) {
    throw new Error(`Failed to fetch transitions for ${key}: ${res.status}`);
  }

  const data = (await res.json()) as {
    transitions: Array<{ id: string; name: string; to: { name: string } }>;
  };

  const target = targetStatus.toLowerCase();
  const transition = data.transitions.find(
    (t) =>
      t.to.name.toLowerCase() === target ||
      t.name.toLowerCase() === target
  );

  if (!transition) {
    const available = data.transitions.map((t) => t.to.name).join(", ");
    throw new Error(
      `No transition to "${targetStatus}" found for ${key}. Available: ${available}`
    );
  }

  const applyRes = await fetch(url, {
    method: "POST",
    headers: headers(email, token),
    body: JSON.stringify({ transition: { id: transition.id } }),
  });

  if (!applyRes.ok) {
    const body = await applyRes.text().catch(() => "");
    throw new Error(`Failed to transition ${key}: ${applyRes.status} ${body}`);
  }

  return { transitionedTo: transition.to.name };
}

export interface UpdateTicketParams {
  key: string;
  summary?: string;
  description?: string;
  labels?: string[];
  priority?: string;
  assignee?: string;
  story_points?: number;
  comment?: string;
}

export interface UpdateTicketResult {
  updatedFields: string[];
  commentAdded: boolean;
  commentError?: string;
}

export async function updateTicket(
  params: UpdateTicketParams
): Promise<UpdateTicketResult> {
  const { baseUrl, email, token } = getConfig();
  const { key, summary, description, labels, priority, assignee, story_points, comment } = params;

  const updatedFields: string[] = [];

  // ── Build field update payload ───────────────────────────────────────────

  const fields: Record<string, unknown> = {};

  if (summary !== undefined) {
    fields.summary = summary;
    updatedFields.push("summary");
  }

  if (description !== undefined) {
    fields.description = textToAdf(description);
    updatedFields.push("description");
  }

  if (labels !== undefined) {
    fields.labels = labels;
    updatedFields.push("labels");
  }

  if (priority !== undefined) {
    fields.priority = { name: priority };
    updatedFields.push("priority");
  }

  if (assignee !== undefined) {
    const accountId = await resolveAssignee(assignee, baseUrl, email, token);
    fields.assignee = { accountId };
    updatedFields.push("assignee");
  }

  if (story_points !== undefined) {
    // customfield_10016 is the standard Jira Cloud story points field.
    fields["customfield_10016"] = story_points;
    updatedFields.push("story_points");
  }

  // ── Make API calls in parallel ───────────────────────────────────────────

  type FieldResult = { type: "fields"; ok: true } | { type: "fields"; ok: false; error: Error };
  type CommentResult = { type: "comment"; ok: true } | { type: "comment"; ok: false; error: Error };

  const tasks: Promise<FieldResult | CommentResult>[] = [];

  if (updatedFields.length > 0) {
    const fieldUpdateUrl = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}`;
    tasks.push(
      fetch(fieldUpdateUrl, {
        method: "PUT",
        headers: headers(email, token),
        body: JSON.stringify({ fields }),
      }).then(async (res): Promise<FieldResult> => {
        if (res.ok) return { type: "fields", ok: true };
        const body = await res.text().catch(() => "");
        if (res.status === 404) throw new Error(`Ticket ${key} not found`);
        if (res.status === 403)
          throw new Error(`You don't have permission to edit ${key}`);
        const parsed = (() => {
          try {
            return JSON.parse(body);
          } catch {
            return null;
          }
        })();
        const errorMessages = (parsed as Record<string, unknown> | null)?.errorMessages;
        const errorFields = (parsed as Record<string, unknown> | null)?.errors;
        const detail =
          (Array.isArray(errorMessages) ? errorMessages.join(", ") : undefined) ||
          (errorFields && typeof errorFields === "object"
            ? Object.entries(errorFields as Record<string, string>)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : undefined) ||
          body;
        throw new Error(`Jira API error ${res.status}: ${detail}`);
      })
    );
  }

  if (comment !== undefined) {
    const commentUrl = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}/comment`;
    tasks.push(
      fetch(commentUrl, {
        method: "POST",
        headers: headers(email, token),
        body: JSON.stringify({ body: textToAdf(comment) }),
      }).then(async (res): Promise<CommentResult> => {
        if (res.ok) return { type: "comment", ok: true };
        const errBody = await res.text().catch(() => "");
        if (res.status === 404) throw new Error(`Ticket ${key} not found`);
        return {
          type: "comment",
          ok: false,
          error: new Error(`Comment failed (${res.status}): ${errBody}`),
        };
      })
    );
  }

  const results = await Promise.allSettled(tasks);

  let commentAdded = false;
  let commentError: string | undefined;

  for (const result of results) {
    if (result.status === "rejected") {
      // Fatal errors (404, 403, field API errors) propagate
      throw result.reason instanceof Error ? result.reason : new Error(String(result.reason));
    }
    if (result.value.type === "comment") {
      if (result.value.ok) {
        commentAdded = true;
      } else {
        commentError = result.value.error.message;
      }
    }
  }

  // If only a comment was requested and it failed non-fatally, surface as error
  if (comment !== undefined && !commentAdded && commentError !== undefined && updatedFields.length === 0) {
    throw new Error(commentError);
  }

  return { updatedFields, commentAdded, commentError };
}
