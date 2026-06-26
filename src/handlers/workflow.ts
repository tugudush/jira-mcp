import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface StatusCategory {
  id?: number
  key?: string
  name?: string
  colorName?: string
}

interface StatusData {
  id: string
  name: string
  description?: string
  iconUrl?: string
  statusCategory?: StatusCategory
}

interface WorkflowScope {
  type?: string
  projectId?: string
}

interface WorkflowData {
  id: string
  name: string
  description?: string
  isDefault?: boolean
  scopes?: WorkflowScope[]
}

function getCategoryLine(category: StatusCategory | undefined): string {
  if (!category) return ''
  const name = category.name ?? 'Unknown'
  return ` (Category: ${name})`
}

/**
 * List all workflow statuses.
 */
export async function handleListStatuses(): Promise<{
  text: string
  data: unknown
}> {
  const url = buildApiUrl('/rest/api/3/status')
  const data = await makeRequest<StatusData[]>(url)

  let text = `Jira Statuses (count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No statuses found.'
  } else {
    text += data
      .map((s) => {
        const cat = getCategoryLine(s.statusCategory)
        const desc = s.description ? ` - ${s.description}` : ''
        return `- [ID: ${s.id}] "${s.name}"${cat}${desc}`
      })
      .join('\n')
  }

  return { text, data }
}

/**
 * List all workflows (paginated).
 */
export async function handleListWorkflows(args: {
  startAt?: number
  maxResults?: number
  workflowName?: string
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    workflowName: args.workflowName,
    expand: args.expand,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/workflow/search'), params)
  const data = await makeRequest<{
    total: number
    values: WorkflowData[]
  }>(url)

  const workflows = data.values || []
  const count = workflows.length
  const total = data.total ?? count

  let text = `Jira Workflows (showing ${count} of ${total}):\n`
  if (workflows.length === 0) {
    text += 'No workflows found.'
  } else {
    text += workflows
      .map((w) => {
        const isDefault = w.isDefault ? ' [Default]' : ''
        const desc = w.description ? `\n  Description: ${w.description}` : ''
        return `- [ID: ${w.id}] "${w.name}"${isDefault}${desc}`
      })
      .join('\n')
  }

  return { text, data }
}
