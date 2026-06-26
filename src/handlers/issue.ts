import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface IssueField {
  summary?: string
  status?: { name: string }
  assignee?: { displayName: string } | null
  priority?: { name: string } | null
  issuetype?: { name: string }
  reporter?: { displayName: string } | null
  created?: string
  updated?: string
  description?: unknown
}

interface IssueData {
  key?: string
  id?: string
  fields?: IssueField
}

interface TransitionData {
  id: string
  name: string
  to?: { name: string }
}

interface TransitionsResponse {
  transitions?: TransitionData[]
}

interface ChangelogItem {
  field?: string
  fromString?: string
  from?: string
  toString?: string
  to?: string
}

interface ChangelogEntry {
  author?: { displayName: string }
  created?: string
  items?: ChangelogItem[]
}

interface CommentEntry {
  author?: { displayName: string }
  created?: string
  body?: unknown
}

interface WorklogEntry {
  author?: { displayName: string }
  timeSpent?: string
  started?: string
  comment?: unknown
}

interface PaginatedResponse<T> {
  startAt: number
  maxResults: number
  total: number
  values?: T[]
  issues?: T[]
  comments?: T[]
  worklogs?: T[]
}

function convertParagraphOrHeading(type: unknown, text: string): string {
  if (type === 'paragraph' || type === 'heading' || type === 'listItem') {
    return text + '\n'
  }
  return text
}

/**
 * Format Atlassian Document Format (ADF) to plain text.
 */
export function convertAdfToText(adf: unknown): string {
  if (!adf) return ''
  if (typeof adf === 'string') return adf
  if (Array.isArray(adf)) {
    return adf.map(convertAdfToText).join('')
  }
  if (typeof adf !== 'object' || adf === null) {
    return ''
  }
  const obj = adf as Record<string, unknown>
  if (obj.type === 'text' && typeof obj.text === 'string') {
    return obj.text
  }
  if (obj.content !== undefined) {
    return convertParagraphOrHeading(obj.type, convertAdfToText(obj.content))
  }
  return ''
}

function getFieldProp(obj: unknown, key1: string, key2?: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const val = (obj as Record<string, Record<string, unknown>>)[key1]
  if (!val) return undefined
  if (key2) {
    if (typeof val === 'object' && val !== null) {
      return val[key2]
    }
    return undefined
  }
  return val
}

function formatSearchResultIssue(issue: IssueData): string {
  const key = issue.key || 'Unknown'
  const fields = issue.fields
  const summary = fields?.summary ?? 'No Summary'
  const status =
    (getFieldProp(fields, 'status', 'name') as string | undefined) ?? 'Unknown'
  const assignee =
    (getFieldProp(fields, 'assignee', 'displayName') as string | undefined) ??
    'Unassigned'
  const priority =
    (getFieldProp(fields, 'priority', 'name') as string | undefined) ?? 'None'
  return `- [${key}] ${summary}\n  Status: ${status} | Assignee: ${assignee} | Priority: ${priority}`
}

/**
 * 1. Search Jira issues (JQL) via POST request
 */
export async function handleSearchIssues(args: {
  jql?: string
  nextPageToken?: string
  maxResults?: number
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl('/rest/api/3/search/jql')

  const payload = {
    jql: args.jql || '',
    nextPageToken: args.nextPageToken,
    maxResults: args.maxResults ?? 50,
    fields: args.fields || ['*navigable'],
    expand: args.expand,
  }

  interface JqlResponse {
    issues?: IssueData[]
    nextPageToken?: string
    isLast?: boolean
  }

  const data = await makeRequest<JqlResponse>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const issues = data.issues || []
  const isLast = data.isLast ?? true
  const nextToken = data.nextPageToken ?? ''

  let text = `Search Issues Results (JQL: "${payload.jql}", count: ${issues.length}, isLast: ${isLast}`
  if (nextToken) {
    text += `, nextPageToken: "${nextToken}"`
  }
  text += '):\n'

  if (issues.length === 0) {
    text += 'No issues found matching query.'
  } else {
    text += issues.map(formatSearchResultIssue).join('\n')
  }

  return { text, data }
}

function formatSearchResultIssueSimple(issue: IssueData): string {
  const key = issue.key || 'Unknown'
  const summary = issue.fields?.summary ?? 'No Summary'
  const status =
    (getFieldProp(issue.fields, 'status', 'name') as string | undefined) ??
    'Unknown'
  const assignee =
    (getFieldProp(issue.fields, 'assignee', 'displayName') as
      | string
      | undefined) ?? 'Unassigned'
  return `- [${key}] ${summary} (Status: ${status}, Assignee: ${assignee})`
}

/**
 * 2. Search Jira issues (JQL) via GET request (Alias/GET variant of search)
 */
export async function handleSearchJql(args: {
  jql?: string
  nextPageToken?: string
  maxResults?: number
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    jql: args.jql || '',
    nextPageToken: args.nextPageToken,
    maxResults: args.maxResults ?? 50,
    fields: args.fields ? args.fields.join(',') : '*navigable',
    expand: args.expand,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/search/jql'), params)

  interface JqlResponse {
    issues?: IssueData[]
    nextPageToken?: string
    isLast?: boolean
  }

  const data = await makeRequest<JqlResponse>(url)

  const issues = data.issues || []
  const isLast = data.isLast ?? true
  const nextToken = data.nextPageToken ?? ''

  let text = `Search Issues Results (GET, count: ${issues.length}, isLast: ${isLast}`
  if (nextToken) {
    text += `, nextPageToken: "${nextToken}"`
  }
  text += '):\n'

  if (issues.length === 0) {
    text += 'No issues found.'
  } else {
    text += issues.map(formatSearchResultIssueSimple).join('\n')
  }

  return { text, data }
}

function getCoalescedProp(
  fields: IssueField,
  key1: string,
  key2: string,
  fallback: string
): string {
  return (getFieldProp(fields, key1, key2) as string | undefined) ?? fallback
}

function formatDetailedIssue(
  key: string,
  fields: IssueField | undefined
): string {
  if (!fields) {
    return `Issue [${key}]: No Summary\n- Type: Unknown\n- Status: Unknown\n- Priority: None\n- Assignee: Unassigned\n- Reporter: None\n- Created: N/A\n- Updated: N/A`
  }
  const summary = fields.summary ?? 'No Summary'
  const descText = convertAdfToText(fields.description).trim()

  const status = getCoalescedProp(fields, 'status', 'name', 'Unknown')
  const type = getCoalescedProp(fields, 'issuetype', 'name', 'Unknown')
  const priority = getCoalescedProp(fields, 'priority', 'name', 'None')
  const assignee = getCoalescedProp(
    fields,
    'assignee',
    'displayName',
    'Unassigned'
  )
  const reporter = getCoalescedProp(fields, 'reporter', 'displayName', 'None')

  const created = fields.created ?? 'N/A'
  const updated = fields.updated ?? 'N/A'

  let text = `Issue [${key}]: ${summary}
- Type: ${type}
- Status: ${status}
- Priority: ${priority}
- Assignee: ${assignee}
- Reporter: ${reporter}
- Created: ${created}
- Updated: ${updated}`

  if (descText) {
    text += `\n- Description:\n${descText}`
  }
  return text
}

/**
 * 3. Fetch one issue by key
 */
export async function handleGetIssue(args: {
  issueIdOrKey: string
  fields?: string[]
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {}
  if (args.fields && args.fields.length > 0) {
    params.fields = args.fields.join(',')
  }
  if (args.expand) {
    params.expand = args.expand
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}`),
    params
  )

  const data = await makeRequest<IssueData>(url)
  const text = formatDetailedIssue(data.key ?? args.issueIdOrKey, data.fields)

  return { text, data }
}

function formatTransition(t: TransitionData): string {
  return `- ID: ${t.id} -> Name: "${t.name}" (Status: ${t.to?.name || 'Unknown'})`
}

/**
 * 4. List allowed transitions for an issue
 */
export async function handleGetIssueTransitions(args: {
  issueIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}/transitions`)
  const data = await makeRequest<TransitionsResponse>(url)

  const transitions = data.transitions || []
  let text = `Transitions allowed for issue ${args.issueIdOrKey}:\n`
  if (transitions.length === 0) {
    text += 'No transitions available.'
  } else {
    text += transitions.map(formatTransition).join('\n')
  }

  return { text, data }
}

function formatChangelogItem(item: ChangelogItem): string {
  const field = item.field || 'field'
  const from = item.fromString || item.from || 'None'
  const to = item.toString || item.to || 'None'
  return `"${field}" changed from "${from}" to "${to}"`
}

function formatChangelogEntry(entry: ChangelogEntry): string {
  const author = entry.author?.displayName || 'Unknown'
  const created = entry.created || 'N/A'
  const itemsText = (entry.items || []).map(formatChangelogItem).join(', ')
  return `- [${created}] ${author}: ${itemsText || 'No modifications'}`
}

/**
 * 5. List changelogs of an issue
 */
export async function handleGetIssueChangelog(args: {
  issueIdOrKey: string
  startAt?: number
  maxResults?: number
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}/changelog`),
    params
  )

  const data = await makeRequest<PaginatedResponse<ChangelogEntry>>(url)
  const total = data.total ?? 0
  const history = data.values || []

  let text = `Changelog for issue ${args.issueIdOrKey} (showing ${history.length} of ${total} entries):\n`
  if (history.length === 0) {
    text += 'No history entries found.'
  } else {
    text += history.map(formatChangelogEntry).join('\n')
  }

  return { text, data }
}

function formatComment(comment: CommentEntry): string {
  const author = comment.author?.displayName || 'Unknown'
  const created = comment.created || 'N/A'
  const bodyText = convertAdfToText(comment.body).trim()
  return `- Author: ${author} | Created: ${created}\n  Comment: ${bodyText || '(Empty comment)'}`
}

/**
 * 6. List comments on an issue
 */
export async function handleGetIssueComments(args: {
  issueIdOrKey: string
  startAt?: number
  maxResults?: number
  orderBy?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    orderBy: args.orderBy,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}/comment`),
    params
  )

  const data = await makeRequest<PaginatedResponse<CommentEntry>>(url)
  const total = data.total ?? 0
  const comments = data.comments || []

  let text = `Comments on ${args.issueIdOrKey} (showing ${comments.length} of ${total} comments):\n`
  if (comments.length === 0) {
    text += 'No comments found.'
  } else {
    text += comments.map(formatComment).join('\n\n')
  }

  return { text, data }
}

function formatWorklog(wl: WorklogEntry): string {
  const author = wl.author?.displayName || 'Unknown'
  const timeSpent = wl.timeSpent || 'N/A'
  const started = wl.started || 'N/A'
  const commentText = convertAdfToText(wl.comment).trim()
  return `- Author: ${author} | Started: ${started} | Time Spent: ${timeSpent}\n  Comment: ${commentText || '(No comment)'}`
}

/**
 * 7. List worklogs on an issue
 */
export async function handleGetIssueWorklogs(args: {
  issueIdOrKey: string
  startAt?: number
  maxResults?: number
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}/worklog`),
    params
  )

  const data = await makeRequest<PaginatedResponse<WorklogEntry>>(url)
  const total = data.total ?? 0
  const worklogs = data.worklogs || []

  let text = `Worklogs for ${args.issueIdOrKey} (showing ${worklogs.length} of ${total} entries):\n`
  if (worklogs.length === 0) {
    text += 'No worklogged hours found.'
  } else {
    text += worklogs.map(formatWorklog).join('\n\n')
  }

  return { text, data }
}
