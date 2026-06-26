#!/usr/bin/env node

/**
 * Jira MCP Server core entry point.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { fileURLToPath } from 'url'
import path from 'path'

import { initializeConfig, loadConfig } from './config.js'
import {
  handleGetCurrentUser,
  handleGetUser,
  handleSearchUsers,
  handleGetAssignableUsers,
} from './handlers/user.js'
import {
  handleListBoards,
  handleGetBoard,
  handleGetBoardIssues,
  handleGetBoardSprints,
  handleGetSprint,
  handleGetSprintIssues,
  handleGetBacklogIssues,
} from './handlers/agile.js'
import {
  handleListFilters,
  handleGetFilter,
  handleGetFavoriteFilters,
} from './handlers/filter.js'
import {
  handleListFields,
  handleListIssueTypes,
  handleGetCreateMeta,
} from './handlers/field.js'
import {
  GetCurrentUserSchema,
  SearchIssuesSchema,
  GetIssueSchema,
  GetIssueTransitionsSchema,
  GetIssueChangelogSchema,
  GetIssueCommentsSchema,
  GetIssueWorklogsSchema,
  GetIssueWatchersSchema,
  ListProjectsSchema,
  GetProjectSchema,
  GetProjectComponentsSchema,
  GetProjectVersionsSchema,
  GetProjectStatusesSchema,
  ListBoardsSchema,
  GetBoardSchema,
  GetBoardIssuesSchema,
  GetBoardSprintsSchema,
  GetSprintSchema,
  GetSprintIssuesSchema,
  GetBacklogIssuesSchema,
  GetUserSchema,
  SearchUsersSchema,
  GetAssignableUsersSchema,
  ListFiltersSchema,
  GetFilterSchema,
  GetFavoriteFiltersSchema,
  ListFieldsSchema,
  ListIssueTypesSchema,
  GetCreateMetaSchema,
} from './schemas.js'
import {
  handleSearchIssues,
  handleSearchJql,
  handleGetIssue,
  handleGetIssueTransitions,
  handleGetIssueChangelog,
  handleGetIssueComments,
  handleGetIssueWorklogs,
  handleGetIssueWatchers,
} from './handlers/issue.js'
import {
  handleListProjects,
  handleGetProject,
  handleGetProjectComponents,
  handleGetProjectVersions,
  handleGetProjectStatuses,
} from './handlers/project.js'
import { VERSION } from './generated/version.js'
import { evaluateFilter } from './filters/jmespath.js'
import { formatText } from './formatters/text.js'
import { formatJson } from './formatters/json.js'
import { formatToon } from './formatters/toon.js'

function getOutputFormat(argFormat?: string): 'text' | 'json' | 'toon' {
  if (argFormat === 'text' || argFormat === 'json' || argFormat === 'toon') {
    return argFormat
  }
  try {
    const config = loadConfig()
    return config.JIRA_DEFAULT_FORMAT
  } catch {
    return 'text'
  }
}

/**
 * Format structured data according to the format type.
 */
function formatResponseData(
  data: unknown,
  format: 'text' | 'json' | 'toon',
  filter?: string
): string {
  let processedData = data
  if (filter) {
    processedData = evaluateFilter(processedData, filter)
  }

  switch (format) {
    case 'json':
      return formatJson(processedData)
    case 'toon':
      return formatToon(processedData)
    default:
      return formatText(processedData)
  }
}

/**
 * Formats data and constructs the finalized MCP tool content response.
 */
function processResponse(
  result: { text: string; data?: unknown },
  format: 'text' | 'json' | 'toon',
  filter?: string
): { content: Array<{ type: 'text'; text: string }> } {
  const defaultText = result.text

  if (format === 'text' && !filter) {
    return {
      content: [{ type: 'text', text: defaultText }],
    }
  }

  if (result.data !== undefined && result.data !== null) {
    const formattedText = formatResponseData(result.data, format, filter)
    return {
      content: [{ type: 'text', text: formattedText }],
    }
  }

  if (filter || format !== 'text') {
    const warning =
      `[Note: output_format="${format}" or filter requested, ` +
      `but no structured data is available for this tool response. ` +
      `Returning default text output.]\n\n`
    return {
      content: [{ type: 'text', text: warning + defaultText }],
    }
  }

  return {
    content: [{ type: 'text', text: defaultText }],
  }
}

/**
 * Helper wrapper for all tool handlers.
 * Standardizes output format (text / JSON / TOON) and evaluates JMESPath filter expression.
 */
export function executeHandler<TArgs extends Record<string, unknown>>(
  handler: (args: TArgs) => Promise<{ text: string; data?: unknown }>
) {
  return async (args: unknown) => {
    try {
      const argsObj = (args || {}) as Record<string, unknown>
      const { output_format: argFormat, filter, ...cleanArgs } = argsObj
      const format = getOutputFormat(
        typeof argFormat === 'string' ? argFormat : undefined
      )

      const result = await handler(cleanArgs as TArgs)
      return processResponse(
        result,
        format,
        typeof filter === 'string' ? filter : undefined
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      }
    }
  }
}

async function runServer() {
  // Validate env vars on startup
  initializeConfig()

  const server = new McpServer(
    { name: 'jira-mcp', version: VERSION },
    { capabilities: { logging: {} } }
  )

  // Register Smoke / Verification Tool
  server.registerTool(
    'jira_get_current_user',
    {
      title: 'Get current user profile (myself)',
      description:
        'Get detailed information about the currently authenticated Jira user. Use GET `/rest/api/3/myself`',
      inputSchema: GetCurrentUserSchema,
    },
    executeHandler(handleGetCurrentUser)
  )

  // --- Issues (8) ---

  server.registerTool(
    'jira_search_issues',
    {
      title: 'Search Jira issues (POST)',
      description:
        'Search Jira issues using JQL via POST request. Uses `/rest/api/3/search/jql` (POST), which is ideal for long JQL queries or when requesting specific large lists of fields.',
      inputSchema: SearchIssuesSchema,
    },
    executeHandler(handleSearchIssues)
  )

  server.registerTool(
    'jira_search_jql',
    {
      title: 'Search Jira issues (GET)',
      description:
        'Search Jira issues using JQL via GET request. Uses GET `/rest/api/3/search/jql`. Note: GET requests can have URI length limits, so for very large queries, use the POST-based `jira_search_issues` tool.',
      inputSchema: SearchIssuesSchema,
    },
    executeHandler(handleSearchJql)
  )

  server.registerTool(
    'jira_get_issue',
    {
      title: 'Get Jira issue by key/ID',
      description:
        'Retrieve detailed information about a single Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}`.',
      inputSchema: GetIssueSchema,
    },
    executeHandler(handleGetIssue)
  )

  server.registerTool(
    'jira_get_issue_transitions',
    {
      title: 'Get issue transitions',
      description:
        'List all permitted workflow transitions for a Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}/transitions`.',
      inputSchema: GetIssueTransitionsSchema,
    },
    executeHandler(handleGetIssueTransitions)
  )

  server.registerTool(
    'jira_get_issue_changelog',
    {
      title: 'Get issue changelog',
      description:
        'Retrieve the full history of field modifications/changelog for a Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}/changelog`.',
      inputSchema: GetIssueChangelogSchema,
    },
    executeHandler(handleGetIssueChangelog)
  )

  server.registerTool(
    'jira_get_issue_comments',
    {
      title: 'Get issue comments',
      description:
        'List comments on a Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}/comment`.',
      inputSchema: GetIssueCommentsSchema,
    },
    executeHandler(handleGetIssueComments)
  )

  server.registerTool(
    'jira_get_issue_worklogs',
    {
      title: 'Get issue worklogs',
      description:
        'List worklogs / time logged on a Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}/worklog`.',
      inputSchema: GetIssueWorklogsSchema,
    },
    executeHandler(handleGetIssueWorklogs)
  )

  server.registerTool(
    'jira_get_issue_watchers',
    {
      title: 'Get issue watchers',
      description:
        'List users watching a Jira issue. Uses GET `/rest/api/3/issue/{issueIdOrKey}/watchers`.',
      inputSchema: GetIssueWatchersSchema,
    },
    executeHandler(handleGetIssueWatchers)
  )

  // --- Projects (5) ---

  server.registerTool(
    'jira_list_projects',
    {
      title: 'List Jira projects (search)',
      description:
        'List all projects accessible to the user (paginated). Uses GET `/rest/api/3/project/search`.',
      inputSchema: ListProjectsSchema,
    },
    executeHandler(handleListProjects)
  )

  server.registerTool(
    'jira_get_project',
    {
      title: 'Get Jira project details',
      description:
        'Get details of a specific project. Uses GET `/rest/api/3/project/{projectIdOrKey}`.',
      inputSchema: GetProjectSchema,
    },
    executeHandler(handleGetProject)
  )

  server.registerTool(
    'jira_get_project_components',
    {
      title: 'Get project components',
      description:
        'List components configured in a project. Uses GET `/rest/api/3/project/{projectIdOrKey}/components`.',
      inputSchema: GetProjectComponentsSchema,
    },
    executeHandler(handleGetProjectComponents)
  )

  server.registerTool(
    'jira_get_project_versions',
    {
      title: 'Get project versions',
      description:
        'List versions (releases) configured in a project. Uses GET `/rest/api/3/project/{projectIdOrKey}/versions`.',
      inputSchema: GetProjectVersionsSchema,
    },
    executeHandler(handleGetProjectVersions)
  )

  server.registerTool(
    'jira_get_project_statuses',
    {
      title: 'Get project statuses mapping',
      description:
        'List all issue types and their active statuses in a specific project. Uses GET `/rest/api/3/project/{projectIdOrKey}/statuses`.',
      inputSchema: GetProjectStatusesSchema,
    },
    executeHandler(handleGetProjectStatuses)
  )

  // --- Agile — Boards & Sprints (7) ---

  server.registerTool(
    'jira_list_boards',
    {
      title: 'List Agile boards',
      description:
        'List all agile boards (scrum/kanban). Uses GET `/rest/agile/1.0/board`.',
      inputSchema: ListBoardsSchema,
    },
    executeHandler(handleListBoards)
  )

  server.registerTool(
    'jira_get_board',
    {
      title: 'Get Agile board details',
      description:
        'Get details of a specific agile board. Uses GET `/rest/agile/1.0/board/{boardId}`.',
      inputSchema: GetBoardSchema,
    },
    executeHandler(handleGetBoard)
  )

  server.registerTool(
    'jira_get_board_issues',
    {
      title: 'Get Board issues',
      description:
        'Retrieve issues associated with an agile board. Uses GET `/rest/agile/1.0/board/{boardId}/issue`. Supports filtering by JQL, fields list and expand.',
      inputSchema: GetBoardIssuesSchema,
    },
    executeHandler(handleGetBoardIssues)
  )

  server.registerTool(
    'jira_get_board_sprints',
    {
      title: 'Get Board sprints',
      description:
        'Retrieve sprints assigned to an agile board. Uses GET `/rest/agile/1.0/board/{boardId}/sprint`. Supports filtering by state (active, future, closed).',
      inputSchema: GetBoardSprintsSchema,
    },
    executeHandler(handleGetBoardSprints)
  )

  server.registerTool(
    'jira_get_sprint',
    {
      title: 'Get Agile sprint details',
      description:
        'Get details of a specific sprint. Uses GET `/rest/agile/1.0/sprint/{sprintId}`.',
      inputSchema: GetSprintSchema,
    },
    executeHandler(handleGetSprint)
  )

  server.registerTool(
    'jira_get_sprint_issues',
    {
      title: 'Get Sprint issues',
      description:
        'Retrieve issues assigned to a sprint. Uses GET `/rest/agile/1.0/sprint/{sprintId}/issue`. Supports filtering by JQL, fields list and expand.',
      inputSchema: GetSprintIssuesSchema,
    },
    executeHandler(handleGetSprintIssues)
  )

  server.registerTool(
    'jira_get_backlog_issues',
    {
      title: 'Get Board backlog issues',
      description:
        'Retrieve backlog issues for a board. Uses GET `/rest/agile/1.0/board/{boardId}/backlog`. Supports filtering by JQL, fields list and expand.',
      inputSchema: GetBacklogIssuesSchema,
    },
    executeHandler(handleGetBacklogIssues)
  )

  // --- Users (3 new + 1 existing) ---

  server.registerTool(
    'jira_get_user',
    {
      title: 'Get User details by ID',
      description:
        'Retrieve details of a user by their unique account ID. Uses GET `/rest/api/3/user`.',
      inputSchema: GetUserSchema,
    },
    executeHandler(handleGetUser)
  )

  server.registerTool(
    'jira_search_users',
    {
      title: 'Search Users',
      description:
        'Search Jira users by query string matching name/display name/email. Uses GET `/rest/api/3/user/search`.',
      inputSchema: SearchUsersSchema,
    },
    executeHandler(handleSearchUsers)
  )

  server.registerTool(
    'jira_get_assignable_users',
    {
      title: 'Get Assignable Users',
      description:
        'Get users assignable to a project or issue. Uses GET `/rest/api/3/user/assignable/search`.',
      inputSchema: GetAssignableUsersSchema,
    },
    executeHandler(handleGetAssignableUsers)
  )

  // --- Filters (3) ---

  server.registerTool(
    'jira_list_filters',
    {
      title: 'List/Search Saved Filters',
      description:
        'Search or list saved JQL filters. Uses GET `/rest/api/3/filter/search`.',
      inputSchema: ListFiltersSchema,
    },
    executeHandler(handleListFilters)
  )

  server.registerTool(
    'jira_get_filter',
    {
      title: 'Get Filter details',
      description:
        'Retrieve details of a saved filter by ID. Uses GET `/rest/api/3/filter/{id}`.',
      inputSchema: GetFilterSchema,
    },
    executeHandler(handleGetFilter)
  )

  server.registerTool(
    'jira_get_favorite_filters',
    {
      title: 'Get Favorite Filters',
      description:
        'Retrieve favorite filters of the current user. Uses GET `/rest/api/3/filter/favourite`.',
      inputSchema: GetFavoriteFiltersSchema,
    },
    executeHandler(handleGetFavoriteFilters)
  )

  // --- Fields & Issue Types (3) ---

  server.registerTool(
    'jira_list_fields',
    {
      title: 'List Jira Fields',
      description:
        'List all custom and system fields in the Jira instance. Uses GET `/rest/api/3/field`.',
      inputSchema: ListFieldsSchema,
    },
    executeHandler(handleListFields)
  )

  server.registerTool(
    'jira_list_issue_types',
    {
      title: 'List Issue Types',
      description:
        'List all issue types in the Jira instance. Uses GET `/rest/api/3/issuetype`.',
      inputSchema: ListIssueTypesSchema,
    },
    executeHandler(handleListIssueTypes)
  )

  server.registerTool(
    'jira_get_create_meta',
    {
      title: 'Get Issue Create Metadata',
      description:
        'Retrieve metadata (createmeta) required for creating issues. Uses GET `/rest/api/3/issue/createmeta`.',
      inputSchema: GetCreateMetaSchema,
    },
    executeHandler(handleGetCreateMeta)
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[jira-mcp] Server successfully connected via stdio`)
}

// Start server if run directly (not loaded as module)
const currentFilePath = fileURLToPath(import.meta.url)
const isMain =
  process.argv[1] &&
  (path.resolve(currentFilePath) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('dist/index.js') ||
    process.argv[1].endsWith('src/index.ts'))

if (isMain) {
  runServer().catch((error) => {
    console.error('Fatal error running server:', error)
    process.exit(1)
  })
}

export { runServer }
export { executeHandler as wrapHandler }
