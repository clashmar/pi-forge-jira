import { Type } from "typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createSubtask } from "../jira/api";
import { getConfig } from "../jira/config";

export function register(pi: ExtensionAPI): void {
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
        description: 'The parent ticket key, e.g. "TEAM-2328"',
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
}
