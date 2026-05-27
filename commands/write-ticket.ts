import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { fetchSprints, fetchEpics } from "../jira/api";
import { TEAM_PREFIX } from "../jira/config";

export function register(pi: ExtensionAPI, prompt: string): void {
  pi.registerCommand("write-ticket", {
    description: "Guided flow to create a new Jira ticket",
    handler: async (_args, _ctx) => {
      const [sprints, epics] = await Promise.all([
        fetchSprints().catch(() => []),
        fetchEpics().catch(() => []),
      ]);

      const sprintList = sprints.length
        ? sprints
            .map(s => `- ${s.name} (ID: ${s.id})${s.state === 'active' ? ' ← active' : ''}`)
            .join('\n')
        : '- No sprints found — backlog only';

      const epicList = epics.length
        ? epics.map(e => `- ${e.key}: ${e.fields.summary} (${e.fields.status.name})`).join('\n')
        : '- No open epics found';

      pi.sendUserMessage(
        prompt
          .replace(/\{\{TEAM_PREFIX\}\}/g, TEAM_PREFIX)
          .replace(/\{\{JIRA_BASE_URL\}\}/g, process.env.JIRA_BASE_URL ?? '')
          .replace(/\{\{SPRINT_LIST\}\}/g, sprintList)
          .replace(/\{\{EPIC_LIST\}\}/g, epicList)
      );
    },
  });
}
