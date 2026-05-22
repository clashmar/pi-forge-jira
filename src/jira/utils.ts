import { jiraRequest, JiraUser } from './client.js';

/**
 * Convert plain text to Atlassian Document Format (ADF)
 */
export function textToADF(text: string) {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text
          }
        ]
      }
    ]
  };
}

/**
 * Search for Jira users by email or display name
 */
export async function searchJiraUsers(query: string): Promise<JiraUser[]> {
  const response = await jiraRequest(`user/search?query=${encodeURIComponent(query)}`);
  return response.json() as Promise<JiraUser[]>;
}

/**
 * Find a user by email address or display name
 */
export async function findUser(identifier: string): Promise<JiraUser | null> {
  const users = await searchJiraUsers(identifier);
  
  // Exact email match
  const emailMatch = users.find(u => u.emailAddress.toLowerCase() === identifier.toLowerCase());
  if (emailMatch) return emailMatch;
  
  // Exact display name match
  const nameMatch = users.find(u => u.displayName.toLowerCase() === identifier.toLowerCase());
  if (nameMatch) return nameMatch;
  
  // Partial match
  const partialMatch = users.find(u => 
    u.emailAddress.toLowerCase().includes(identifier.toLowerCase()) ||
    u.displayName.toLowerCase().includes(identifier.toLowerCase())
  );
  
  return partialMatch || null;
}