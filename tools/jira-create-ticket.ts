import { Type } from "typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createTicket } from "../jira/api";
import { getConfig } from "../jira/config";
import type { CreateTicketParams } from "../jira/types";

export function register(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "jira_create_ticket",
    label: "Create Jira Ticket",
    description:
      "Create a new Jira ticket (Epic, Story, Task, or Sub-task) with all structured fields " +
      "mapped to native Jira fields. Call this only after collecting and confirming all details with the user.",
    promptSnippet: "Create a Jira ticket with structured fields",
    promptGuidelines: [
      "Use jira_create_ticket only after reviewing all collected fields with the user",
      "For Epics, epicName is required — it is the short label shown on the board",
      "For Sub-tasks, parentKey is the parent story key",
      "For Stories and Tasks, parentKey is the epic key (sets the Epic Link field)",
      "Omit storyPoints entirely if the user did not specify a value",
      "Omit sprintId to place the ticket in the backlog",
      "issueLinks linkType must be a valid Jira link type name: 'Blocks', 'Relates', etc.",
    ],
    parameters: Type.Object({
      summary: Type.String({ description: "One-line ticket title" }),
      issuetype: Type.Union(
        [
          Type.Literal("Epic"),
          Type.Literal("Story"),
          Type.Literal("Task"),
          Type.Literal("Sub-task"),
        ],
        { description: "Issue type" }
      ),
      epicName: Type.Optional(
        Type.String({ description: "Short board label — required for Epics" })
      ),
      parentKey: Type.Optional(
        Type.String({
          description:
            "Epic key for Stories/Tasks (sets Epic Link); story key for Sub-tasks (sets parent)",
        })
      ),
      sprintId: Type.Optional(
        Type.Number({ description: "Sprint ID; omit to place in backlog" })
      ),
      storyPoints: Type.Optional(
        Type.Number({ description: "Story point estimate; omit if not specified by user" })
      ),
      description: Type.Optional(
        Type.String({
          description:
            "Structured plain text with ### headings: User Story, Context, Risks, Out of Scope, Open Questions, Codebases",
        })
      ),
      acceptanceCriteria: Type.Optional(
        Type.String({ description: "Plain text acceptance criteria (Jira native field)" })
      ),
      dependencies: Type.Optional(
        Type.String({ description: "Plain text dependency description (Jira native field)" })
      ),
      notesAssumptions: Type.Optional(
        Type.String({ description: "Plain text notes and assumptions (Jira native field)" })
      ),
      defOfReadyDone: Type.Optional(
        Type.String({
          description: "Plain text Definition of Ready / Done checklist (Jira native field)",
        })
      ),
      issueLinks: Type.Optional(
        Type.Array(
          Type.Object({
            key: Type.String({ description: "Ticket key to link to, e.g. TEAM-123" }),
            linkType: Type.String({
              description: "Jira link type name: 'Blocks', 'Relates', 'Duplicate'",
            }),
          })
        )
      ),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const { baseUrl } = getConfig();
      const created = await createTicket(params as CreateTicketParams);
      const url = `${baseUrl}/browse/${created.key}`;
      return {
        content: [
          {
            type: "text",
            text: `Created **${created.key}**\n\n${url}`,
          },
        ],
        details: {
          key: created.key,
          url,
        },
      };
    },
  });
}
