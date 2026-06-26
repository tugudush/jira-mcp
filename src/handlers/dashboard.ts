import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface DashboardOwner {
  accountId: string
  displayName: string
}

interface DashboardSharing {
  isPublic?: boolean
}

interface DashboardData {
  id: string
  name: string
  view: string
  self?: string
  description?: string
  owner?: DashboardOwner
  sharing?: DashboardSharing
}

interface DashboardPaginated {
  startAt: number
  maxResults: number
  total: number
  isLast?: boolean
  values: DashboardData[]
}

interface DashboardGadgetPosition {
  row?: number
  col?: number
}

interface DashboardGadget {
  id: number
  moduleKey?: string
  title?: string
  color?: string
  position?: DashboardGadgetPosition
}

interface DashboardDetailData extends DashboardData {
  gadgets?: DashboardGadget[]
}

function getOwnerLine(owner: DashboardOwner | undefined): string {
  return owner ? `\n- Owner: ${owner.displayName} (${owner.accountId})` : ''
}

function getPublicBadge(sharing: DashboardSharing | undefined): string {
  return sharing?.isPublic ? ' [Public]' : ''
}

function formatGadgets(gadgets: DashboardGadget[]): string {
  if (gadgets.length === 0) {
    return '\n\nGadgets: None'
  }
  let text = `\n\nGadgets (${gadgets.length}):\n`
  text += gadgets
    .map((g) => {
      const title = g.title ? `"${g.title}"` : '(untitled)'
      const moduleKey = g.moduleKey ? ` (Module: ${g.moduleKey})` : ''
      return `- [ID: ${g.id}] ${title}${moduleKey}`
    })
    .join('\n')
  return text
}

/**
 * List all dashboards.
 */
export async function handleListDashboards(args: {
  startAt?: number
  maxResults?: number
  filter?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    filter: args.filter,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/dashboard'), params)
  const data = await makeRequest<DashboardPaginated>(url)

  const dashboards = data.values || []
  const count = dashboards.length
  const total = data.total ?? count

  let text = `Jira Dashboards (showing ${count} of ${total}):\n`
  if (dashboards.length === 0) {
    text += 'No dashboards found.'
  } else {
    text += dashboards
      .map((d) => {
        const owner = d.owner?.displayName
          ? ` | Owner: ${d.owner.displayName}`
          : ''
        const pub = getPublicBadge(d.sharing)
        return `- [ID: ${d.id}] "${d.name}"${pub}${owner}`
      })
      .join('\n')
  }

  return { text, data }
}

/**
 * Retrieve detailed info for a single dashboard, including gadgets.
 */
export async function handleGetDashboard(args: {
  dashboardId: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/dashboard/${args.dashboardId}`)
  const data = await makeRequest<DashboardDetailData>(url)

  const owner = getOwnerLine(data.owner)
  const pub = getPublicBadge(data.sharing)
  const description = data.description
    ? `\n- Description: ${data.description}`
    : ''

  const gadgets = data.gadgets || []
  const gadgetText = formatGadgets(gadgets)

  const text = `Dashboard [${data.id}]: ${data.name}${pub}${owner}${description}${gadgetText}`

  return { text, data }
}
