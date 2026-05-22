# pi-forge-jira

Contribution guidelines for contributing to pi-forge-jira.

## Commit Messages

Use conventional commit format:

```md
type(scope): short description
```

- **type**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- **scope**: affected area, e.g., `footer`, `copilot-api`, `tui`, `cache`
- Description is lowercase, no trailing period, under 72 characters total

Examples:

```md
feat(footer): add premium quota display
fix(copilot-api): handle token refresh race condition
refactor(cache): extract expiry logic to constant
docs(footer): document GitHub Copilot API requirements
test(formatting): add token number localization tests
```

## Code Style

### No `any` types

Do not use `any` in TypeScript code. The project uses `strict: true` which implies `noImplicitAny`.

- Prefer `unknown` with explicit narrowing
- `as` type assertions are acceptable when narrowing to a specific type (not `any`)

### JSDoc Comments

Use `/** ... */` for public API exports only — document WHAT not HOW:

```ts
/** Formats token count with locale-aware separators. */
function formatTokens(count: number): string { ... }
```

Do not document implementation details. Minimize other comments (one line max) and prefer self-documenting code with readable names.

## One Source of Truth

Do not hardcode repeated values. Derive all consumption from a single source.

Before adding footer helpers, shelling out (e.g. `execSync`), or iterating raw session entries, check the existing typed pi APIs first:

- **Branch name** → `footerData.getGitBranch()` (reactive watcher, no subprocess)
- **Extension status entries** → `footerData.getExtensionStatuses()` (already-rendered strings from any `setStatus()` caller)
- **Session entries** → `ctx.sessionManager.getEntries()` only if the data isn't already surfaced by `footerData`

Inventing helpers that duplicate data already available in `ReadonlyFooterDataProvider` adds unnecessary complexity and bypasses pi's existing reactivity.

Examples:

```ts
// GOOD: Define once, use everywhere
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// BAD: Hardcoded in multiple functions
if (Date.now() - lastFetch > 600000) { ... }
if (lastFetch && Date.now() - lastFetch > 600000) { ... }
```

Extract shared abstractions when logic repeats across functions. Before adding a new subsystem, search for existing equivalents and reuse where possible.

## Comments

Keep comments minimal and focused:

- Use `/** ... */` JSDoc for public APIs only
- Other comments: one line maximum, prefer self-documenting code
- If protecting against future regressions, use `console.assert()` with a message

```ts
console.assert(
  model.category === "copilot-pro",
  "Premium quota only available for Copilot Pro models"
);
```
