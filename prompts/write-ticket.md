# /write-ticket: Create a new Jira ticket

Work through each step in order. Ask one question at a time. Do not skip steps unless the step says to.

---

## Step 1: Ticket Type

Ask the user what type of ticket they want to create:

- Epic
- Story
- Task
- Sub-task

---

## Step 2: Summary

Ask for a one-line summary. Remind the user:

- Sub-tasks should be prefixed with the parent key: `PARENT-KEY: short description`
- Keep it under 80 characters

---

## Step 3: Epic Name (Epics only)

Skip this step if the type is not Epic.

Ask for the Epic Name — the short label shown on the board column header. This is **required** and cannot be skipped.

---

## Step 4: Parent / Epic

**For Epics:** skip this step entirely — epics are top-level.

**For Sub-tasks:** ask for the parent story key (e.g. `{{TEAM_PREFIX}}-123`).

**For Stories and Tasks:** present the list of open epics and ask the user to pick one or enter a key manually. If the list is empty or they want no parent, that is fine — omit `parentKey`.

Open epics:
{{EPIC_LIST}}

If the user is unsure about which epic or what the right context is, offer:
> "Should I search ~/Code for relevant context?"

If yes, use `find` and `grep` to identify related repos or files and summarise the findings before continuing.

---

## Step 5: Sprint

Present the available sprints and ask the user to choose:

{{SPRINT_LIST}}

- Backlog (no sprint)

Record the sprint ID if a sprint is chosen. If the user chooses Backlog, omit `sprintId` from the submission.

---

## Step 6: Story Points

Ask for a story point estimate. This is optional. If the user says "skip", "unsure", or leaves it blank, omit `storyPoints` from the submission entirely — do not default to 0.

---

## Step 7: Description Scaffold

Draft each section below in sequence. Present each one, ask the user to confirm or edit it, then move on. If the user says "skip" for any section, omit it.

Sections:

- **User Story**: `As a [persona], I want [goal], so that [benefit]`
- **Context**: background the implementer needs to understand the work
- **Risks**: what could go wrong or cause delays; "None identified" is acceptable
- **Out of Scope**: explicit statement of what this ticket does NOT include
- **Open Questions**: unresolved items the team should be aware of; "None" is acceptable
- **Codebases**: repos or services involved

For the **Codebases** section: if the user is unsure, offer to search ~/Code. If they agree, run:

```md
find ~/Code -maxdepth 2 \( -name "package.json" -o -name "composer.json" \) | head -30
```

Identify likely relevant repos from the results and present a short summary before asking the user to confirm.

Once all sections are confirmed, combine them into the `description` parameter using exactly this format (omit any skipped sections):

```me
### User Story
[text]

### Context
[text]

### Risks
[text]

### Out of Scope
[text]

### Open Questions
[text]

### Codebases
[text]
```

---

## Step 8: Acceptance Criteria

Ask for acceptance criteria — a bullet list of testable conditions. Each bullet should start with a verb:

- "The user can..."
- "The API returns..."
- "The page displays..."

Skippable. If skipped, omit `acceptanceCriteria`.

---

## Step 9: Dependencies

Ask if there are any dependencies — other work or external requirements that must be completed first. Skippable. If skipped, omit `dependencies`.

---

## Step 10: Notes / Assumptions

Ask if there are any notes or assumptions the team should know. Skippable. If skipped, omit `notesAssumptions`.

---

## Step 11: Definition of Ready / Done

Ask if the user wants to add a Definition of Ready or Done checklist. Skippable. If skipped, omit `defOfReadyDone`.

---

## Step 12: Linked Issues

Ask if this ticket blocks, is blocked by, or relates to any other tickets. Collect as many as needed. Skippable.

Supported Jira link type names: `Blocks`, `Relates`, `Duplicate`.

Collect each linked ticket key and whether the relationship is "blocks", "is blocked by", or "relates to". Pass each as an entry in `issueLinks` with the appropriate `linkType` name.

---

## Step 13: Review and Submit

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

**DoR / DoD:** [value or "not set"]

**Linked Issues:** [list or "none"]

---

Ask: "Create this ticket?" — wait for explicit confirmation before submitting.

If confirmed, call `jira_create_ticket` with all collected parameters.

On success, show:
> Created **[KEY]** — {{JIRA_BASE_URL}}/browse/[KEY]
