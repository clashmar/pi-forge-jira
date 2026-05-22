import type { JiraIssue } from "./types";

/**
 * Recursively extract plain text from Atlassian Document Format (ADF).
 */
export function adfToText(node: unknown, depth = 0): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  if (n.type === "text" && typeof n.text === "string") {
    return n.text;
  }

  if (Array.isArray(n.content)) {
    const parts = (n.content as unknown[]).map((child) =>
      adfToText(child, depth + 1)
    );
    const joined = parts.join("");

    switch (n.type) {
      case "paragraph":
        return joined + "\n\n";
      case "heading": {
        const level = (n.attrs as Record<string, unknown>)?.level ?? 1;
        return "#".repeat(Number(level)) + " " + joined + "\n\n";
      }
      case "bulletList":
      case "orderedList":
        return joined + "\n";
      case "listItem":
        return (
          "  ".repeat(Math.max(0, depth - 1)) +
          "• " +
          joined.trim() +
          "\n"
        );
      case "blockquote":
        return (
          joined
            .split("\n")
            .map((l: string) => "> " + l)
            .join("\n") + "\n"
        );
      case "codeBlock":
        return "```\n" + joined + "\n```\n\n";
      default:
        return joined;
    }
  }

  return "";
}

/** Convert plain text to minimal ADF. Double newlines → paragraphs, single newlines → hardBreak. */
export function textToAdf(text: string): object {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  return {
    type: "doc",
    version: 1,
    content: paragraphs.map((para) => {
      const lines = para.split("\n");
      const content: object[] = [];
      lines.forEach((line, i) => {
        content.push({ type: "text", text: line });
        if (i < lines.length - 1) {
          content.push({ type: "hardBreak" });
        }
      });
      return { type: "paragraph", content };
    }),
  };
}

const NO_DESCRIPTION = "(no description)";

export function formatDescription(description: unknown): string {
  if (!description) return NO_DESCRIPTION;
  if (typeof description === "string") return description;
  const text = adfToText(description).trim();
  return text || NO_DESCRIPTION;
}

export function formatIssue(issue: JiraIssue): string {
  const f = issue.fields;
  const lines: string[] = [];

  lines.push(`# ${issue.key}: ${f.summary}`);
  lines.push("");
  lines.push(`**Type:** ${f.issuetype?.name ?? "Unknown"}`);
  lines.push(`**Status:** ${f.status.name}`);
  if (f.priority) lines.push(`**Priority:** ${f.priority.name}`);
  if (f.assignee) lines.push(`**Assignee:** ${f.assignee.displayName}`);
  if (f.reporter) lines.push(`**Reporter:** ${f.reporter.displayName}`);
  if (f.labels?.length) lines.push(`**Labels:** ${f.labels.join(", ")}`);
  if (f.parent)
    lines.push(
      `**Parent:** ${f.parent.key}${f.parent.fields ? ` — ${f.parent.fields.summary}` : ""}`
    );
  lines.push("");

  lines.push("## Description");
  lines.push("");
  lines.push(formatDescription(f.description));

  if (f.subtasks?.length) {
    lines.push("");
    lines.push("## Subtasks");
    for (const sub of f.subtasks) {
      const icon = sub.fields.status.name === "Done" ? "✅" : "⬜";
      lines.push(
        `${icon} ${sub.key}: ${sub.fields.summary} (${sub.fields.status.name})`
      );
    }
  }

  if (f.comment?.comments?.length) {
    lines.push("");
    lines.push("## Comments");
    const recent = f.comment.comments.slice(-5);
    for (const c of recent) {
      const date = new Date(c.created).toLocaleDateString();
      lines.push("");
      lines.push(`**${c.author.displayName}** (${date}):`);
      lines.push(adfToText(c.body).trim());
    }
  }

  return lines.join("\n");
}
