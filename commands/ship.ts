import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { TEAM_PREFIX } from "../jira/config";

export function register(pi: ExtensionAPI, shipPrompt: string): void {
  pi.registerCommand("ship", {
    description: "Stage, commit and open a PR (e.g. /ship [TEAM-XXXX])",
    handler: async (args, _ctx) => {
      const rawKey = args?.trim() ?? "";
      const normalisedKey =
        TEAM_PREFIX && /^\d+$/.test(rawKey)
          ? `${TEAM_PREFIX}-${rawKey}`
          : rawKey.toUpperCase();
      const keyInstruction = rawKey
        ? `The ticket key is ${normalisedKey}.`
        : `Check the current branch name for a TEAM-XXXX prefix and use that. If no information is available, ask which ticket this work belongs to.`;

      const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "") ?? "";

      pi.sendUserMessage(
        shipPrompt
          .replace("{{KEY_INSTRUCTION}}", keyInstruction)
          .replace(/\{\{TEAM_PREFIX\}\}/g, TEAM_PREFIX)
          .replace(/\{\{JIRA_BASE_URL\}\}/g, baseUrl)
      );
    },
  });
}
