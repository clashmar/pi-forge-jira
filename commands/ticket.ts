import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { TEAM_PREFIX } from "../jira/config";

export function register(pi: ExtensionAPI, ticketPrompt: string): void {
  pi.registerCommand("ticket", {
    description:
      "Load a Jira ticket, set up a branch, and start planning (e.g. /ticket TEAM-123 [subtask summary])",
    handler: async (args, _ctx) => {
      if (!args?.trim()) {
        pi.sendUserMessage("I ran /ticket without a ticket key. Ask me which ticket I want to work on, then run through the ticket workflow once I reply.");
        return;
      }

      const parts = args.trim().split(/\s+/);
      const rawKey = parts[0];
      const key =
        TEAM_PREFIX && /^\d+$/.test(rawKey)
          ? `${TEAM_PREFIX}-${rawKey}`
          : rawKey.toUpperCase();
      const subtaskSummary = parts.slice(1).join(" ");

      const subtaskInstruction = subtaskSummary
        ? `Create a subtask immediately with jira_create_subtask using "${subtaskSummary}" as the summary. Use the resulting subtask key going forward. Update the footer with the subtask link.`
        : `No subtask summary was provided — work directly against ${key}.`;

      pi.sendUserMessage(
        ticketPrompt
          .replace(/\{\{KEY\}\}/g, key)
          .replace("{{SUBTASK_INSTRUCTION}}", subtaskInstruction)
          .replace(/\{\{TEAM_PREFIX\}\}/g, TEAM_PREFIX)
      );
    },
  });
}
