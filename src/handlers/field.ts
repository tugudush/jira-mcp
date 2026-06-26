import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface FieldData {
  id: string
  name: string
  custom: boolean
  orderable: boolean
  navigable: boolean
  searchable: boolean
  clauseNames?: string[]
  schema?: {
    type: string
    system?: string
    custom?: string
    customId?: number
  }
}

interface IssueTypeData {
  id: string
  name: string
  description?: string
  subtask: boolean
  avatarId?: number
}

/**
 * List all custom and system fields.
 */
export async function handleListFields(): Promise<{
  text: string
  data: unknown
}> {
  const url = buildApiUrl('/rest/api/3/field')
  const data = await makeRequest<FieldData[]>(url)

  let text = `Jira Fields (count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No fields found.'
  } else {
    text += data
      .map(
        (f) =>
          `- [ID: ${f.id}] "${f.name}" (Type: ${f.schema?.type || 'N/A'}, Custom: ${f.custom})`
      )
      .join('\n')
  }

  return { text, data }
}

/**
 * List all issue types.
 */
export async function handleListIssueTypes(): Promise<{
  text: string
  data: unknown
}> {
  const url = buildApiUrl('/rest/api/3/issuetype')
  const data = await makeRequest<IssueTypeData[]>(url)

  let text = `Jira Issue Types (count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No issue types found.'
  } else {
    text += data
      .map(
        (t) =>
          `- [ID: ${t.id}] "${t.name}" (Subtask: ${t.subtask}) - ${t.description || 'No description'}`
      )
      .join('\n')
  }

  return { text, data }
}

/**
 * Retrieve create-issue metadata (createmeta) for projects and issue types.
 */
export async function handleGetCreateMeta(args: {
  projectIds?: string[]
  projectKeys?: string[]
  issueTypeIds?: string[]
  issueTypeNames?: string[]
  expand?: string
  startAt?: number
  maxResults?: number
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    projectIds: args.projectIds ? args.projectIds.join(',') : undefined,
    projectKeys: args.projectKeys ? args.projectKeys.join(',') : undefined,
    issueTypeIds: args.issueTypeIds ? args.issueTypeIds.join(',') : undefined,
    issueTypeNames: args.issueTypeNames
      ? args.issueTypeNames.join(',')
      : undefined,
    expand: args.expand,
    startAt: args.startAt,
    maxResults: args.maxResults,
  }

  const url = addQueryParams(
    buildApiUrl('/rest/api/3/issue/createmeta'),
    params
  )
  const data = await makeRequest<unknown>(url)

  const text = `Issue Create Metadata retrieved successfully. Use formatted output or JSON representation to inspect the structure.`

  return { text, data }
}
