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
