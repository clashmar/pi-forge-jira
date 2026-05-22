export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: unknown;
    status: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string; emailAddress: string } | null;
    reporter?: { displayName: string; emailAddress: string } | null;
    issuetype?: { name: string };
    labels?: string[];
    created?: string;
    updated?: string;
    parent?: { key: string; fields?: { summary: string } };
    subtasks?: Array<{
      key: string;
      fields: { summary: string; status: { name: string } };
    }>;
    comment?: {
      comments: Array<{
        author: { displayName: string };
        body: unknown;
        created: string;
      }>;
    };
    [key: string]: unknown;
  };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
}
