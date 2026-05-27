/**
 * Jira integration extension for pi
 *
 * Provides:
 *   - `jira_ticket` tool: fetch ticket details
 *   - `jira_create_subtask` tool: create sub-tasks
 *   - `jira_create_ticket` tool: create a new ticket (Epic, Story, Task, Sub-task)
 *   - `jira_transition` tool: move tickets between statuses
 *   - `jira_update_ticket` tool: update ticket fields and add comments
 *   - `/ticket` command: load a ticket, set up a branch, and start planning
 *   - `/ship` command: stage, commit, push, open PR, move to Code Review
 *   - `/write-ticket` command: guided flow to create a fully structured Jira ticket
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

import { readFileSync } from "fs";
import { join } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { register as registerJiraTicket } from "./tools/jira-ticket";
import { register as registerCreateSubtask } from "./tools/jira-create-subtask";
import { register as registerCreateTicket } from "./tools/jira-create-ticket";
import { register as registerTransition } from "./tools/jira-transition";
import { register as registerUpdateTicket } from "./tools/jira-update-ticket";
import { register as registerTicketCommand } from "./commands/ticket";
import { register as registerShipCommand } from "./commands/ship";
import { register as registerWriteTicketCommand } from "./commands/write-ticket";

const TICKET_PROMPT = readFileSync(join(__dirname, "prompts/ticket.md"), "utf-8");
const SHIP_PROMPT = readFileSync(join(__dirname, "prompts/ship.md"), "utf-8");
const WRITE_TICKET_PROMPT = readFileSync(join(__dirname, "prompts/write-ticket.md"), "utf-8");

export default function jiraExtension(pi: ExtensionAPI) {
  registerJiraTicket(pi);
  registerCreateSubtask(pi);
  registerCreateTicket(pi);
  registerTransition(pi);
  registerUpdateTicket(pi);
  registerTicketCommand(pi, TICKET_PROMPT);
  registerShipCommand(pi, SHIP_PROMPT);
  registerWriteTicketCommand(pi, WRITE_TICKET_PROMPT);
}
