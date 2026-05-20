# pi-forge-jira

Jira integration extension for [pi](https://github.com/earendil-works/pi)

Provides tools and commands covering the full ticket lifecycle.

## Prerequisites

Set these in your `~/.zshrc`:

```bash
export JIRA_BASE_URL="https://your-organization.atlassian.net"
export JIRA_EMAIL="you@your-organization.com"
export JIRA_API_TOKEN="..."  # https://id.atlassian.com/manage-profile/security/api-tokens
```

## Install

```bash
git clone git@github.com:Forge-Holiday-Group/pi-forge-jira.git ~/Personal/pi-forge-jira
cd ~/Personal/pi-forge-jira
./install.sh
# Restart/Reload pi
```

## Tools

| Tool | Description | When the PI uses it |
| ---- | ----------- | -------------------- |
| `jira_ticket` | Fetch ticket details (summary, description, status, subtasks, comments) | When you mention a ticket key like `OPTIONTEXT-123` or just `123` |
| `jira_create_subtask` | Create a sub-task auto-assigned to you, added to the current sprint | Before starting a focused slice of work |
| `jira_transition` | Move a ticket to a named status | After raising a PR (→ Code Review) or starting work (→ In Progress) |

## Commands

### `/ticket TEAM-XXXX [subtask summary]`

Full start-of-work flow: fetches the ticket, optionally creates a subtask, sets up the branch, and invokes the planning skill.

```md
/ticket TEAM-2400              # load ticket, go straight to planning
/ticket 2400                   # shorthand — auto-prefixes TEAM-
/ticket TEAM-2400 add filters  # creates subtask "add filters" first
```

### `/ship [TEAM-XXXX]`

Full shipping flow: identifies the ticket, validates the branch, stages/commits, pushes, opens a PR, and moves the ticket to Code Review.

```md
/ship               # picks up ticket from current branch
/ship TEAM-2400     # explicit ticket key
/ship 2400          # shorthand
```

## Configuration

Optional environment variables with their defaults:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `JIRA_BOARD_ID` | `275` | Board ID for sprint lookup |
| `JIRA_SUBTASK_TYPE` | `5` | Jira issue type ID for sub-tasks |
| `JIRA_ASSIGNEE_ID` | My account ID | Account ID for auto-assignment |

## Uninstall

```bash
./uninstall.sh
# Restart pi
```
