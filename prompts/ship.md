Walk through the full ship checklist for the current working changes. Follow each step in order and stop to confirm before destructive git operations.

## Ticket / Subtask

1. Identify the relevant Jira ticket: {{KEY_INSTRUCTION}}

2. Fetch the ticket with jira_ticket and show its title and status.

3. Decide whether a subtask is needed:
   - If the changes represent the whole ticket's scope, work against the parent ticket.
   - If the changes are a focused slice of a larger ticket, create a subtask with jira_create_subtask. Use the resulting subtask key going forward.

4. Update the footer context with set_context (ticket link).

## Branch

5. Check the current branch (git branch --show-current).

6. The correct branch name format is {{TEAM_PREFIX}}-XXXX-short-description where {{TEAM_PREFIX}}-XXXX is the ticket or subtask key and the description is a few hyphenated lowercase words.

7. If the current branch already matches this format for the correct ticket, stay on it.

8. If the branch is wrong or is main:
   a. Stash uncommitted changes: git stash push -m "ship: pre-branch stash"
   b. Switch to main and pull: git checkout main && git pull
   c. Create the new branch: git checkout -b {{TEAM_PREFIX}}-XXXX-short-description
   d. Pop the stash: git stash pop
   e. Confirm the stash applied cleanly before continuing.

## Stage & Commit

9. Show the current diff (git diff and git status).

10. Stage the relevant files. If there are unrelated changes in the working tree, ask which files to include.

11. Commit using this format exactly:
    {{TEAM_PREFIX}}-XXXX short description of what this commit does
    The {{TEAM_PREFIX}}-XXXX should match the ticket/subtask number.

## Pull Request

12. Push the branch: git push -u origin <branch>.

13. Open a PR with gh pr create using:
    - Title: {{TEAM_PREFIX}}-XXXX Short description
    - Body:
      ## Summary
      <2-3 bullet points of what changed and why; leave out implementation details>

      ## Testing
      - [ ] <key thing to verify manually>
      - [ ] <regression check if applicable>

      Jira: [{{TEAM_PREFIX}}-XXXX]({{JIRA_BASE_URL}}/browse/{{TEAM_PREFIX}}-XXXX)

14. Report the PR URL and update the footer mr context with the link.

## Update Jira

15. Move the Jira ticket to Code Review using jira_transition.
