# Load ticket {{KEY}}. Work through each step in order

## 1. Load the Ticket

Fetch {{KEY}} with jira_ticket and show:

- Title, status, description
- Any existing subtasks and their statuses
- Any linked tickets or blockers

Update the footer with set_context (ticket link).

## 2. Subtask

{{SUBTASK_INSTRUCTION}}

When creating a subtask, prefix its summary with the full ticket key:
`{{TEAM_PREFIX}}-XXXX: short description of the task`
The subtask key assigned by Jira must match the branch created in Step 3.

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

- Invoke any planning skills avaialable to turn the ticket requirements into a design before any code is written.
- If planning specific skills are not avaiable, plan the ticket with the user without them.
- Before asking any questions, explore relevant project context using parallel subagents.
- Follow the full planning process through to an approved design and written spec.
