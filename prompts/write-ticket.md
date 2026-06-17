# /write-ticket: Create a new Jira ticket

Work through each step in order. Ask one question at a time. Do not skip steps unless the step says to.

---

## Step 1: Ticket Type

Ask the user what type of ticket they want to create:

- Parent/Epic
- Story
- Task
- Sub-task

---

## Step 2: Summary

Ask for a one-line summary. Remind the user:

- Sub-tasks should be prefixed with the parent key: `PARENT-KEY: short description`
- Keep it under 80 characters

Using context already available in the conversation, infer an appropriate short prefix and prepend it to the summary. Common prefixes: `PASC` (Pascal), `KEP` (Kepler), `HYP` (Hyperion), `ENT` (Enterprise), `BUG` (bug fix). Use your discretion — if no prefix is clearly appropriate, omit it. Do not ask the user about the prefix.

---

## Step 3: Parent/Epic Name (Parent/Epics only)

Skip this step if the type is not Parent/Epic.

Ask for the Parent/Epic Name — the short label shown on the board column header. This is **required** and cannot be skipped.

---

## Step 4: Parent / Epic

**For Parents/Epics:** skip this step entirely — parents/epics are top-level.

**For Sub-tasks:** ask for the parent/epic story key (e.g. `{{TEAM_PREFIX}}-123`).

**For Stories and Tasks:** present the list of open parents/epics and ask the user to pick one or enter a key manually. If the list is empty or they want no parent, that is fine — omit `parentKey`.

Open epics:
{{EPIC_LIST}}

If the user is unsure about which parent/epic or what the right context is, offer:
> "Should I search ~/Code for relevant context?"

If yes, use `find` and `grep` to identify related repos or files and summarise the findings before continuing.

---

## Step 5: Sprint

Present the available sprints and ask the user to choose:

{{SPRINT_LIST}}

- Backlog (no sprint)

Record the sprint ID if a sprint is chosen. If the user chooses Backlog, omit `sprintId` from the submission.

---

## Step 6: Description Scaffold

Work through each section below one at a time. Present your draft for each, ask the user to confirm or edit it, then move on. If the user says "skip" for any section, omit it.

### User Story

Before drafting, ask the user three questions in sequence:

1. Who is the primary user or persona for this ticket? (e.g. "a developer", "a property owner", "a content manager")
2. What do they want to do? (the goal or action)
3. What benefit does it give them? (the outcome or reason)

Once you have those answers, compose the user story:
`As a [persona], I want [goal], so that [benefit]`

Present the composed sentence and ask the user to confirm or edit it.

### Context

Ask the user: "Is there any background context the implementer should know — e.g. why this is needed, what it replaces, or how it fits into a larger piece of work?"

Draft a short paragraph from their answer and ask them to confirm.

### Risks

Ask the user: "Are there any risks or things that could go wrong?" If they say no, use "None identified."

### Out of Scope

Ask the user: "Is there anything that's explicitly NOT included in this ticket — things someone might assume are in scope but aren't?"

### Codebases

Ask the user which repos or services are involved. If they're unsure, offer to search ~/Code:

```md
find ~/Code -maxdepth 2 \( -name "package.json" -o -name "composer.json" \) | head -30
```

Identify likely relevant repos from the results and present a short summary before asking the user to confirm.

---

Once all sections are confirmed, combine them into the `description` parameter using exactly this format (omit any skipped sections):

```md
### User Story
[text]

### Context
[text]

### Risks
[text]

### Out of Scope
[text]

### Codebases
[text]
```

---

## Step 7: Acceptance Criteria

Ask for acceptance criteria — a bullet list of testable conditions. Each bullet should start with a verb:

- "The user can..."
- "The API returns..."
- "The page displays..."

Skippable. If skipped, omit `acceptanceCriteria`.

---

## Step 8: Dependencies

Ask if there are any dependencies — other work or external requirements that must be completed first. Skippable. If skipped, omit `dependencies`.

---

## Step 9: Notes / Assumptions

Ask if there are any notes or assumptions the team should know. Skippable. If skipped, omit `notesAssumptions`.

---

## Step 10: Linked Issues

Ask if this ticket blocks, is blocked by, or relates to any other tickets. Collect as many as needed. Skippable.

Supported Jira link type names: `Blocks`, `Relates`, `Duplicate`.

Collect each linked ticket key and whether the relationship is "blocks", "is blocked by", or "relates to". Pass each as an entry in `issueLinks` with the appropriate `linkType` name.

---

## Step 11: Story Points

Ask for a story point estimate. This is optional. If the user says "skip", "unsure", or leaves it blank, omit `storyPoints` from the submission entirely — do not default to 0.

---

## Step 12: Review and Submit

Print a formatted summary of everything collected:

---
**Summary:** [summary]
**Type:** [type]
**Epic Name:** [value — Epics only, otherwise omit line]
**Parent:** [key or "none"]
**Sprint:** [sprint name or "Backlog"]
**Story Points:** [value or "not set"]
**Description sections:** [list of included section headings]
**Acceptance Criteria:** [first 100 chars or "not set"]
**Dependencies:** [value or "not set"]
**Notes / Assumptions:** [value or "not set"]
**Linked Issues:** [list or "none"]
---

Ask: "Create this ticket?" — wait for explicit confirmation before submitting.

If confirmed, call `jira_create_ticket` with all collected parameters.

On success, show:
> Created **[KEY]** — {{JIRA_BASE_URL}}/browse/[KEY]
