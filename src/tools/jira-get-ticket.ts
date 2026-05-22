import { jiraRequest, type JiraTicket } from '../jira/index.js';

export const jiraGetTicketTool = {
  name: 'jira_get_ticket',
  description: 'Get details of a Jira ticket by key',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Jira ticket key (e.g., PHOEN-1234)',
      },
    },
    required: ['key'],
  },
  handler: async ({ key }: { key: string }) => {
    try {
      const response = await jiraRequest(`issue/${key}?fields=key,summary,description,labels,priority,assignee,customfield_10016`);
      const ticket: JiraTicket = await response.json();

      // Extract plain text from description ADF
      let description = '';
      if (ticket.fields.description?.content) {
        for (const block of ticket.fields.description.content) {
          if (block.type === 'paragraph' && block.content) {
            for (const inline of block.content) {
              if (inline.type === 'text' && inline.text) {
                description += inline.text;
              }
            }
            description += '\n';
          }
        }
      }

      return {
        key: ticket.key,
        summary: ticket.fields.summary,
        description: description.trim(),
        labels: ticket.fields.labels,
        priority: ticket.fields.priority?.name,
        assignee: ticket.fields.assignee
          ? {
              name: ticket.fields.assignee.displayName,
              email: ticket.fields.assignee.emailAddress,
            }
          : null,
        storyPoints: ticket.fields.customfield_10016,
      };
    } catch (error) {
      if (error instanceof Error) {
        // Clean up "not found" errors
        if (error.message.includes('404')) {
          throw new Error(`Ticket ${key} not found`);
        }
        throw error;
      }
      throw new Error(`Failed to get ticket ${key}`);
    }
  },
};