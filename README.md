# pi-forge-jira

Jira integration extension for [pi](https://github.com/earendil-works/pi)

Provides tools and commands covering the full ticket lifecycle.

## Prerequisites

Set the following environment variables in your shell config or system environment:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `JIRA_BASE_URL` | ✓ | e.g. `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | ✓ | Your Atlassian account email |
| `JIRA_API_TOKEN` | ✓ | [Create a token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_TEAM_PREFIX` | recommended | Your Jira team prefix (e.g. `TEAM`) — enables `/ticket 2400` shorthand |

**macOS / Linux (bash or zsh)** — add to `~/.zshrc`, `~/.bashrc`, or equivalent:

```bash
export JIRA_BASE_URL="https://your-org.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="..."
export JIRA_TEAM_PREFIX="TEAM"
```

**Windows (PowerShell profile)** — add to `$PROFILE`:

```powershell
$env:JIRA_BASE_URL = "https://your-org.atlassian.net"
$env:JIRA_EMAIL = "you@example.com"
$env:JIRA_API_TOKEN = "..."
$env:JIRA_TEAM_PREFIX = "TEAM"
```

Or set them permanently via **System Properties → Environment Variables**.

## Install

```bash
git clone git@github.com:Forge-Holiday-Group/pi-forge-jira.git ~/Wherever/pi-forge-jira
cd ~/Wherever/pi-forge-jira
./install.sh
# Restart/Reload pi
```

## Tools

| Tool | Description | When the PI uses it |
| ---- | ----------- | ------------------- |
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

Optional environment variables:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `JIRA_BOARD_ID` | `275` | Board ID for sprint lookup |
| `JIRA_SUBTASK_TYPE` | `5` | Jira issue type ID for sub-tasks |
| `JIRA_ASSIGNEE_ID` | — | Account ID for auto-assignment |

## Uninstall

```bash
./uninstall.sh
# Restart pi
```
