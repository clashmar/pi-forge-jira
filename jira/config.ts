export const BOARD_ID = process.env.JIRA_BOARD_ID ?? "275";
export const SUBTASK_TYPE_ID = process.env.JIRA_SUBTASK_TYPE ?? "5";
export const ASSIGNEE_ACCOUNT_ID =
  process.env.JIRA_ASSIGNEE_ID ?? "712020:a73621b6-1c28-46b9-815a-d5cd8da82987";
export const TEAM_PREFIX = process.env.JIRA_TEAM_PREFIX ?? "";

export function getConfig() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    const missing = [
      !baseUrl && "JIRA_BASE_URL",
      !email && "JIRA_EMAIL",
      !token && "JIRA_API_TOKEN",
    ].filter(Boolean);
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. ` +
        "Set them in your shell config (~/.zshrc)."
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), email, token };
}

export function authHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

export function headers(email: string, token: string): Record<string, string> {
  return {
    Authorization: authHeader(email, token),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}
