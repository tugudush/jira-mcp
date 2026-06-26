import { z } from 'zod'

/**
 * Output format and filtering options schema, merged into every tool's schema.
 */
export const OutputOptionsSchema = z.object({
  output_format: z
    .enum(['text', 'json', 'toon'])
    .optional()
    .describe(
      'Response format: "text" (default, human-readable), "json" (structured JSON), or "toon" (Token-Oriented Object Notation — compact tabular format that reduces LLM token consumption by 30-60%)'
    ),
  filter: z
    .string()
    .optional()
    .describe(
      'JMESPath expression to filter/transform structured response data. Applied before format conversion. Example: "values[].{name: full_name, lang: language}" — see https://jmespath.org for syntax'
    ),
})

/**
 * Helper to extend any Zod schema with the standard output options.
 */
export function withOutputOptions<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
) {
  return schema.merge(OutputOptionsSchema)
}

/**
 * Schema for jira_get_current_user
 */
export const GetCurrentUserSchema = withOutputOptions(z.object({}))

/**
 * Schema for jira_search_issues and jira_search_jql
 */
export const SearchIssuesSchema = withOutputOptions(
  z.object({
    jql: z
      .string()
      .optional()
      .describe(
        'The JQL (Jira Query Language) string. E.g., \'project = PROJ AND status = "In Progress"\''
      ),
    startAt: z
      .number()
      .optional()
      .describe(
        'The index of the first item to return in a page of results (0-based)'
      ),
    maxResults: z
      .number()
      .optional()
      .describe(
        'The maximum number of items to return per page (default: 50, max: 100)'
      ),
    fields: z
      .array(z.string())
      .optional()
      .describe(
        "A list of fields to return for each issue. Use ['*navigable'] for standard fields"
      ),
    expand: z
      .string()
      .optional()
      .describe(
        "The extra details to expand in the response, e.g., 'renderedFields', 'changelog'"
      ),
  })
)

/**
 * Schema for jira_get_issue
 */
export const GetIssueSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
    fields: z
      .array(z.string())
      .optional()
      .describe(
        'A list of fields to return. If not specified, all fields are returned'
      ),
    expand: z
      .string()
      .optional()
      .describe(
        "Extra details to expand, e.g., 'renderedFields', 'changelog', 'transitions'"
      ),
  })
)

/**
 * Schema for jira_get_issue_transitions
 */
export const GetIssueTransitionsSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
  })
)

/**
 * Schema for jira_get_issue_changelog
 */
export const GetIssueChangelogSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
  })
)

/**
 * Schema for jira_get_issue_comments
 */
export const GetIssueCommentsSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    orderBy: z
      .string()
      .optional()
      .describe(
        "Order comments by: 'created', '-created', etc. (default: 'created')"
      ),
  })
)

/**
 * Schema for jira_get_issue_worklogs
 */
export const GetIssueWorklogsSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
  })
)

/**
 * Schema for jira_get_issue_watchers
 */
export const GetIssueWatchersSchema = withOutputOptions(
  z.object({
    issueIdOrKey: z
      .string()
      .describe(
        "The complete key (e.g., 'PROJ-123') or the numerical ID of the issue"
      ),
  })
)

/**
 * Schema for jira_list_projects
 */
export const ListProjectsSchema = withOutputOptions(
  z.object({
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    query: z
      .string()
      .optional()
      .describe('Search string to filter projects by key or name'),
    orderBy: z
      .string()
      .optional()
      .describe("Order by: 'key', '-key', 'name', '-name', 'owner', '-owner'"),
  })
)

/**
 * Schema for jira_get_project
 */
export const GetProjectSchema = withOutputOptions(
  z.object({
    projectIdOrKey: z
      .string()
      .describe("The key (e.g., 'PROJ') or the numerical ID of the project"),
  })
)

/**
 * Schema for jira_get_project_components
 */
export const GetProjectComponentsSchema = withOutputOptions(
  z.object({
    projectIdOrKey: z
      .string()
      .describe("The key (e.g., 'PROJ') or the numerical ID of the project"),
  })
)

/**
 * Schema for jira_get_project_versions
 */
export const GetProjectVersionsSchema = withOutputOptions(
  z.object({
    projectIdOrKey: z
      .string()
      .describe("The key (e.g., 'PROJ') or the numerical ID of the project"),
  })
)

/**
 * Schema for jira_get_project_statuses
 */
export const GetProjectStatusesSchema = withOutputOptions(
  z.object({
    projectIdOrKey: z
      .string()
      .describe("The key (e.g., 'PROJ') or the numerical ID of the project"),
  })
)

/**
 * Schema for jira_list_boards
 */
export const ListBoardsSchema = withOutputOptions(
  z.object({
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    type: z
      .string()
      .optional()
      .describe('Filter boards by type (e.g., "scrum", "kanban")'),
    name: z
      .string()
      .optional()
      .describe('Filter boards by name (case-insensitive substring match)'),
    projectKeyOrId: z
      .string()
      .optional()
      .describe('Filter boards by project key or ID'),
  })
)

/**
 * Schema for jira_get_board
 */
export const GetBoardSchema = withOutputOptions(
  z.object({
    boardId: z.number().describe('The ID of the board'),
  })
)

/**
 * Schema for jira_get_board_issues
 */
export const GetBoardIssuesSchema = withOutputOptions(
  z.object({
    boardId: z.number().describe('The ID of the board'),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    jql: z.string().optional().describe('Filter issues using a JQL string'),
    fields: z
      .array(z.string())
      .optional()
      .describe('Fields to return for each issue'),
    expand: z.string().optional().describe('Extra details to expand'),
  })
)

/**
 * Schema for jira_get_board_sprints
 */
export const GetBoardSprintsSchema = withOutputOptions(
  z.object({
    boardId: z.number().describe('The ID of the board'),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    state: z
      .string()
      .optional()
      .describe(
        'Filter sprints by state: "future", "active", or "closed" (comma-separated is supported too)'
      ),
  })
)

/**
 * Schema for jira_get_sprint
 */
export const GetSprintSchema = withOutputOptions(
  z.object({
    sprintId: z.number().describe('The ID of the sprint'),
  })
)

/**
 * Schema for jira_get_sprint_issues
 */
export const GetSprintIssuesSchema = withOutputOptions(
  z.object({
    sprintId: z.number().describe('The ID of the sprint'),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    jql: z.string().optional().describe('Filter issues using a JQL string'),
    fields: z
      .array(z.string())
      .optional()
      .describe('Fields to return for each issue'),
    expand: z.string().optional().describe('Extra details to expand'),
  })
)

/**
 * Schema for jira_get_backlog_issues
 */
export const GetBacklogIssuesSchema = withOutputOptions(
  z.object({
    boardId: z.number().describe('The ID of the board'),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    jql: z.string().optional().describe('Filter issues using a JQL string'),
    fields: z
      .array(z.string())
      .optional()
      .describe('Fields to return for each issue'),
    expand: z.string().optional().describe('Extra details to expand'),
  })
)

/**
 * Schema for jira_get_user
 */
export const GetUserSchema = withOutputOptions(
  z.object({
    accountId: z.string().describe('The unique account ID of the user'),
  })
)

/**
 * Schema for jira_search_users
 */
export const SearchUsersSchema = withOutputOptions(
  z.object({
    query: z
      .string()
      .describe('Prefix of the user name, display name or email address'),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
  })
)

/**
 * Schema for jira_get_assignable_users
 */
export const GetAssignableUsersSchema = withOutputOptions(
  z.object({
    query: z
      .string()
      .optional()
      .describe('Prefix of the user name, display name or email address'),
    projectKey: z
      .string()
      .optional()
      .describe(
        'The project key (e.g. "PROJ") (at least projectKey or issueKey is required)'
      ),
    issueKey: z
      .string()
      .optional()
      .describe(
        'The issue key (e.g. "PROJ-123") (at least projectKey or issueKey is required)'
      ),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
  })
)

/**
 * Schema for jira_list_filters
 */
export const ListFiltersSchema = withOutputOptions(
  z.object({
    filterName: z.string().optional().describe('Prefix of the filter name'),
    accountId: z
      .string()
      .optional()
      .describe('The account ID of the user who shared the filter'),
    ownerAccountId: z
      .string()
      .optional()
      .describe('The account ID of the user who owns the filter'),
    orderBy: z
      .string()
      .optional()
      .describe(
        'Order results by: "id", "-id", "name", "-name", "description", "-description", "isFavorite", "-isFavorite"'
      ),
    startAt: z
      .number()
      .optional()
      .describe('The index of the first item to return (0-based)'),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return'),
    expand: z
      .string()
      .optional()
      .describe('Extra details to expand, e.g. "sharedUsers", "subscriptions"'),
  })
)

/**
 * Schema for jira_get_filter
 */
export const GetFilterSchema = withOutputOptions(
  z.object({
    id: z.number().describe('The ID of the filter'),
    expand: z
      .string()
      .optional()
      .describe('Extra details to expand, e.g. "sharedUsers", "subscriptions"'),
  })
)

/**
 * Schema for jira_get_favorite_filters
 */
export const GetFavoriteFiltersSchema = withOutputOptions(
  z.object({
    expand: z
      .string()
      .optional()
      .describe('Extra details to expand, e.g. "sharedUsers", "subscriptions"'),
  })
)

/**
 * Schema for jira_list_fields
 */
export const ListFieldsSchema = withOutputOptions(z.object({}))

/**
 * Schema for jira_list_issue_types
 */
export const ListIssueTypesSchema = withOutputOptions(z.object({}))

/**
 * Schema for jira_get_create_meta
 */
export const GetCreateMetaSchema = withOutputOptions(
  z.object({
    projectIds: z
      .array(z.string())
      .optional()
      .describe('List of project IDs to filter metadata'),
    projectKeys: z
      .array(z.string())
      .optional()
      .describe('List of project keys to filter metadata'),
    issueTypeIds: z
      .array(z.string())
      .optional()
      .describe('List of issue type IDs to filter metadata'),
    issueTypeNames: z
      .array(z.string())
      .optional()
      .describe('List of issue type names to filter metadata'),
    expand: z
      .string()
      .optional()
      .describe('Details to expand, e.g. "projects.issuetypes.fields"'),
    startAt: z
      .number()
      .optional()
      .describe(
        'The index of the first item to return (0-based) for pagination'
      ),
    maxResults: z
      .number()
      .optional()
      .describe('The maximum number of items to return per page'),
  })
)
