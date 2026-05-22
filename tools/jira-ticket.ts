import { Type } from "typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { fetchIssue } from "../jira/api";
import { formatIssue } from "../jira/adf";
import { getConfig } from "../jira/config";

export function register(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "jira_ticket",
    label: "Jira Ticket",
    description:
      "Fetch a Jira ticket's details including summary, description, status, assignee, subtasks, and recent comments. " +
      "Use this when you need to understand what a ticket requires before starting work.",
    promptSnippet:
      "Fetch Jira ticket details (summary, description, status, comments)",
    promptGuidelines: [
      "Use jira_ticket to fetch ticket details when the user mentions a Jira ticket key like TEAM-123",
      "After fetching a ticket with jira_ticket, also call set_context to track it in the footer",
    ],
    parameters: Type.Object({
      key: Type.String({
        description: 'Jira issue key, e.g. "TEAM-123"',
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
}
