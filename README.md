# pi-forge-jira

Jira integration extension for [pi](https://github.com/mariozechner/pi-coding-agent) — Forge Holiday Group.

Provides three LLM tools and two workflow commands covering the full ticket lifecycle.

## Prerequisites

Set these in your `~/.zshrc`:

```bash
export JIRA_BASE_URL="https://forgeholidays.atlassian.net"
export JIRA_EMAIL="you@forgeholidaygroup.com"
export JIRA_API_TOKEN="..."  # https://id.atlassian.com/manage-profile/security/api-tokens
```

## Install

```bash
git clone git@github.com:Forge-Holiday-Group/pi-forge-jira.git ~/Personal/pi-forge-jira
cd ~/Personal/pi-forge-jira
./install.sh
# Restart pi
```

## Tools

| Tool | Description | When the LLM uses it |
|---|---|---|
| `jira_ticket` | Fetch ticket details (summary, description, status, subtasks, comments) | When you mention a ticket key like `PHOEN-123` |
| `jira_create_subtask` | Create a sub-task auto-assigned to you, added to the current sprint | Before starting a focused slice of work |
| `jira_transition` | Move a ticket to a named status | After raising a PR (→ Code Review) or starting work (→ In Progress) |

## Commands

### `/ticket PHOEN-XXXX [subtask summary]`

Full start-of-work flow: fetches the ticket, optionally creates a subtask, sets up the branch, and invokes the planning skill.

```
/ticket PHOEN-2400              # load ticket, go straight to planning
/ticket 2400                    # shorthand — auto-prefixes PHOEN-
/ticket PHOEN-2400 add filters  # creates subtask "add filters" first
```

### `/ship [PHOEN-XXXX]`

Full shipping flow: identifies the ticket, validates the branch, stages/commits, pushes, opens a PR, and moves the ticket to Code Review.

```
/ship                           # picks up ticket from current branch
/ship PHOEN-2400                # explicit ticket key
/ship 2400                      # shorthand
```

## Configuration

Optional environment variables with their defaults:

| Variable | Default | Description |
|---|---|---|
| `JIRA_BOARD_ID` | `275` | Board ID for sprint lookup |
| `JIRA_SUBTASK_TYPE` | `5` | Jira issue type ID for sub-tasks |
| `JIRA_ASSIGNEE_ID` | Charles's account ID | Account ID for auto-assignment |

## Uninstall

```bash
./uninstall.sh
# Restart pi
```
