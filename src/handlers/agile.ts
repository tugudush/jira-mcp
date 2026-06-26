import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface BoardLocation {
  projectKey?: string
  projectName?: string
}

interface BoardData {
  id: number
  self: string
  name: string
  type: string
  location?: BoardLocation
}

interface SprintData {
  id: number
  self: string
  state: string
  name: string
  startDate?: string
  endDate?: string
  completeDate?: string
  goal?: string
}

interface AgilePaginated<T> {
  startAt: number
  maxResults: number
  total?: number
  isLast?: boolean
  values: T[]
}

interface IssueField {
  summary?: string
  status?: { name: string }
  assignee?: { displayName: string } | null
  priority?: { name: string } | null
}

interface IssueData {
  key?: string
  id?: string
  fields?: IssueField
}

interface SprintIssuesResponse {
  total: number
  issues: IssueData[]
}

function getStatusName(fields: IssueField | undefined): string {
  return fields?.status?.name ?? 'Unknown'
}

function getAssigneeName(fields: IssueField | undefined): string {
  return fields?.assignee?.displayName ?? 'Unassigned'
}

function getPriorityName(fields: IssueField | undefined): string {
  return fields?.priority?.name ?? 'None'
}

function formatAgileIssue(issue: IssueData): string {
  const key = issue.key || 'Unknown'
  const fields = issue.fields
  const summary = fields?.summary ?? 'No Summary'
  const status = getStatusName(fields)
  const assignee = getAssigneeName(fields)
  const priority = getPriorityName(fields)
  return `- [${key}] ${summary}\n  Status: ${status} | Assignee: ${assignee} | Priority: ${priority}`
}

/**
 * List all agile boards.
 */
export async function handleListBoards(args: {
  startAt?: number
  maxResults?: number
  type?: string
  name?: string
  projectKeyOrId?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    type: args.type,
    name: args.name,
    projectKeyOrId: args.projectKeyOrId,
  }

  const url = addQueryParams(buildApiUrl('/rest/agile/1.0/board'), params)
  const data = await makeRequest<AgilePaginated<BoardData>>(url)

  const boards = data.values || []
  const count = boards.length
  const total = data.total ?? count

  let text = `Agile Boards (showing ${count} of ${total}):\n`
  if (boards.length === 0) {
    text += 'No boards found.'
  } else {
    text += boards
      .map((b) => {
        const proj = b.location?.projectKey
          ? ` | Project: ${b.location.projectKey}`
          : ''
        return `- [ID: ${b.id}] "${b.name}" (Type: ${b.type}${proj})`
      })
      .join('\n')
  }

  return { text, data }
}

/**
 * Retrieve detailed info for a single board.
 */
export async function handleGetBoard(args: {
  boardId: number
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/agile/1.0/board/${args.boardId}`)
  const data = await makeRequest<BoardData>(url)

  const proj = data.location
    ? `\n- Project: ${data.location.projectName} (${data.location.projectKey})`
    : ''
  const text = `Board [${data.id}]: ${data.name}
- Type: ${data.type}${proj}`

  return { text, data }
}

/**
 * Retrieve issues associated with a board.
 */
export async function handleGetBoardIssues(args: {
  boardId: number
  startAt?: number
  maxResults?: number
  jql?: string
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    jql: args.jql,
    fields: args.fields ? args.fields.join(',') : undefined,
    expand: args.expand,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/agile/1.0/board/${args.boardId}/issue`),
    params
  )
  const data = await makeRequest<SprintIssuesResponse>(url)

  const issues = data.issues || []
  const total = data.total ?? issues.length

  let text = `Issues for Board ${args.boardId} (showing ${issues.length} of ${total}):\n`
  if (issues.length === 0) {
    text += 'No issues found.'
  } else {
    text += issues.map(formatAgileIssue).join('\n')
  }

  return { text, data }
}

/**
 * Retreive sprints in a board.
 */
export async function handleGetBoardSprints(args: {
  boardId: number
  startAt?: number
  maxResults?: number
  state?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    state: args.state,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/agile/1.0/board/${args.boardId}/sprint`),
    params
  )
  const data = await makeRequest<AgilePaginated<SprintData>>(url)

  const sprints = data.values || []
  const total = data.total ?? sprints.length

  let text = `Sprints for Board ${args.boardId} (showing ${sprints.length} of ${total}):\n`
  if (sprints.length === 0) {
    text += 'No sprints found.'
  } else {
    text += sprints
      .map((s) => {
        const dates =
          s.startDate && s.endDate ? ` [${s.startDate} - ${s.endDate}]` : ''
        const goal = s.goal ? ` | Goal: ${s.goal}` : ''
        return `- [ID: ${s.id}] "${s.name}" (State: ${s.state}${dates}${goal})`
      })
      .join('\n')
  }

  return { text, data }
}

/**
 * Retrieve a sprint by ID.
 */
export async function handleGetSprint(args: {
  sprintId: number
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/agile/1.0/sprint/${args.sprintId}`)
  const data = await makeRequest<SprintData>(url)

  const dates = [
    data.startDate ? `- Start Date: ${data.startDate}` : null,
    data.endDate ? `- End Date: ${data.endDate}` : null,
    data.completeDate ? `- Completed Date: ${data.completeDate}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const goal = data.goal ? `\n- Goal: ${data.goal}` : ''
  const text = `Sprint [${data.id}]: ${data.name}
- State: ${data.state} ${dates}${goal}`

  return { text, data }
}

/**
 * Retrieve issues inside a sprint.
 */
export async function handleGetSprintIssues(args: {
  sprintId: number
  startAt?: number
  maxResults?: number
  jql?: string
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    jql: args.jql,
    fields: args.fields ? args.fields.join(',') : undefined,
    expand: args.expand,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/agile/1.0/sprint/${args.sprintId}/issue`),
    params
  )
  const data = await makeRequest<SprintIssuesResponse>(url)

  const issues = data.issues || []
  const total = data.total ?? issues.length

  let text = `Issues for Sprint ${args.sprintId} (showing ${issues.length} of ${total}):\n`
  if (issues.length === 0) {
    text += 'No issues found.'
  } else {
    text += issues.map(formatAgileIssue).join('\n')
  }

  return { text, data }
}

/**
 * Retrieve backlog issues for a board.
 */
export async function handleGetBacklogIssues(args: {
  boardId: number
  startAt?: number
  maxResults?: number
  jql?: string
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    jql: args.jql,
    fields: args.fields ? args.fields.join(',') : undefined,
    expand: args.expand,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/agile/1.0/board/${args.boardId}/backlog`),
    params
  )
  const data = await makeRequest<SprintIssuesResponse>(url)

  const issues = data.issues || []
  const total = data.total ?? issues.length

  let text = `Backlog Issues for Board ${args.boardId} (showing ${issues.length} of ${total}):\n`
  if (issues.length === 0) {
    text += 'No issues found.'
  } else {
    text += issues.map(formatAgileIssue).join('\n')
  }

  return { text, data }
}
