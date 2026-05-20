# Load ticket {{KEY}}. Work through each step in order

## 1. Load the Ticket

Fetch {{KEY}} with jira_ticket and show:

- Title, status, description
- Any existing subtasks and their statuses
- Any linked tickets or blockers

Update the footer with set_context (ticket link).

## 2. Subtask

{{SUBTASK_INSTRUCTION}}

## 3. Branch Setup

Check the current branch (git branch --show-current).
The correct branch name format is: {{TEAM_PREFIX}}-XXXX-short-description

If already on the correct branch: confirm and move on.
If on a different branch or on main:

1. Stash uncommitted changes: git stash push -m "ticket: pre-branch stash"
2. Switch to main and pull: git checkout main && git pull
3. Create the new branch: git checkout -b {{TEAM_PREFIX}}-XXXX-short-description
4. If stash was made, pop it: git stash pop — confirm it applied cleanly.

## 4. Planning

- Invoke the planning skill to turn the ticket requirements into a design before any code is written.
- Before asking any questions, explore relevant project context using parallel subagents. 
- Follow the full planning process through to an approved design and written spec.
