import { Type } from "typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { updateTicket } from "../jira/api";

export function register(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "jira_update_ticket",
    label: "Update Jira Ticket",
    description:
      "Update one or more fields on an existing Jira ticket. " +
      "Call this when the user asks to change a ticket's summary, description, labels, priority, assignee, or story points, or to add a comment. " +
      "Only provide the fields you want to change — omitted fields are left untouched. " +
      "Labels are a full replacement — if you want to add a label, first call jira_ticket to retrieve the current labels, then pass the merged array. " +
      "Pass comment to append a note without changing any fields.",
    promptSnippet: "Update Jira ticket fields or add a comment",
    promptGuidelines: [
      "Use jira_update_ticket when the user asks to change a ticket's fields or add a comment",
      "Only pass the fields you want to change — omitted fields are left untouched",
      "Labels replace the full label array — fetch the ticket first if you only want to add/remove one label",
    ],
    parameters: Type.Object({
      key: Type.String({
        description: 'Jira issue key, e.g. "PHX-1234"',
      }),
      summary: Type.Optional(
        Type.String({ description: "Replaces the ticket title entirely. Use the full desired title." })
      ),
      description: Type.Optional(
        Type.String({
          description:
            "Replaces the full description. Plain text — no ADF needed. Use the full intended description.",
        })
      ),
      labels: Type.Optional(
        Type.Array(Type.String(), {
          description:
            "Full replacement of the label list. Call jira_ticket first if you only want to add/remove one label.",
        })
      ),
      priority: Type.Optional(
        Type.Union(
          [
            Type.Literal("P1"),
            Type.Literal("P2"),
            Type.Literal("P3"),
            Type.Literal("P4"),
            Type.Literal("P5"),
          ],
          { description: "Priority level. P1 is most urgent, P5 is lowest." }
        )
      ),
      assignee: Type.Optional(
        Type.String({
          description:
            "The user's Jira account ID or email address. Email is resolved to accountId automatically.",
        })
      ),
      story_points: Type.Optional(
        Type.Number({ description: "Numeric story point estimate." })
      ),
      comment: Type.Optional(
        Type.String({
          description:
            "Plain text to append as a new comment. Can be used alone or alongside field updates.",
        })
      ),
    }),
    async execute(_id, params, _signal, _onUpdate, _ctx) {
      const { key, summary, description, labels, priority, assignee, story_points, comment } = params;

      const hasFieldChange =
        summary !== undefined ||
        description !== undefined ||
        labels !== undefined ||
        priority !== undefined ||
        assignee !== undefined ||
        story_points !== undefined;

      if (!hasFieldChange && comment === undefined) {
        throw new Error("Nothing to update — provide at least one field to change");
      }

      if (summary !== undefined && summary.trim().length === 0) {
        throw new Error("Summary cannot be blank");
      }

      if (assignee !== undefined && assignee.trim().length === 0) {
        throw new Error("Assignee cannot be blank");
      }

      if (description !== undefined && description.trim().length === 0) {
        throw new Error("Description cannot be blank");
      }

      if (comment !== undefined && comment.trim().length === 0) {
        throw new Error("Comment cannot be blank");
      }

      const normalizedKey = key.toUpperCase().trim();
      const result = await updateTicket({
        key: normalizedKey,
        summary,
        description,
        labels,
        priority,
        assignee: assignee?.trim(),
        story_points,
        comment,
      });

      const lines: string[] = [];

      if (result.updatedFields.length > 0) {
        lines.push(`Updated ${normalizedKey}:`);
        for (const field of result.updatedFields) {
          const value = (() => {
            switch (field) {
              case "summary": return summary;
              case "description": return "(updated)";
              case "labels": return labels?.join(", ") ?? "";
              case "priority": return priority;
              case "assignee": return assignee;
              case "story_points": return String(story_points);
              default: return "(updated)";
            }
          })();
          lines.push(`• ${field} → ${value}`);
        }
        if (result.commentAdded) {
          lines.push("• Added comment ✓");
        }
      } else if (result.commentAdded) {
        lines.push(`Added comment to ${normalizedKey} ✓`);
      }

      if (result.commentError) {
        lines.push(`⚠️ ${result.commentError}`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          key: normalizedKey,
          updatedFields: result.updatedFields,
          commentAdded: result.commentAdded,
        },
      };
    },
  });
}
