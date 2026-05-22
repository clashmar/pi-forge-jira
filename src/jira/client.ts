import { execSync } from 'child_process';

export interface JiraConfig {
  host: string;
  email: string;
  token: string;
}

export interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    description?: {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          text?: string;
        }>;
      }>;
    };
    labels: string[];
    priority?: {
      name: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    } | null;
    customfield_10016?: number; // Story Points
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

/**
 * Get Jira configuration from git config
 */
export function getJiraConfig(): JiraConfig {
  try {
    const host = execSync('git config jira.host', { encoding: 'utf8' }).trim();
    const email = execSync('git config jira.email', { encoding: 'utf8' }).trim();
    const token = execSync('git config jira.token', { encoding: 'utf8' }).trim();
    
    if (!host || !email || !token) {
      throw new Error('Missing Jira configuration. Run: git config jira.host <host> && git config jira.email <email> && git config jira.token <token>');
    }
    
    return { host, email, token };
  } catch (error) {
    throw new Error('Jira not configured. Run: git config jira.host <host> && git config jira.email <email> && git config jira.token <token>');
  }
}

/**
 * Make authenticated request to Jira API
 */
export async function jiraRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getJiraConfig();
  const url = `https://${config.host}/rest/api/3/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Jira API error ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.errorMessages?.length > 0) {
        errorMessage += `: ${errorBody.errorMessages.join(', ')}`;
      } else if (errorBody.errors) {
        const errors = Object.entries(errorBody.errors).map(([field, msg]) => `${field}: ${msg}`);
        errorMessage += `: ${errors.join(', ')}`;
      }
    } catch {
      // If we can't parse the error body, just use the status
    }
    throw new Error(errorMessage);
  }

  return response;
}