import { Type } from "typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { transitionIssue } from "../jira/api";

export function register(pi: ExtensionAPI): void {
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
        description: 'Jira issue key, e.g. "TEAM-2342"',
      }),
      status: Type.String({
        description:
          'Target status name, e.g. "Code Review", "In Progress", "Done"',
      }),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const key = params.key.toUpperCase().trim();
      const { transitionedTo } = await transitionIssue(key, params.status);

      return {
        content: [
          {
            type: "text",
            text: `Moved **${key}** to **${transitionedTo}**.`,
          },
        ],
        details: { key, status: transitionedTo },
      };
    },
  });
}
