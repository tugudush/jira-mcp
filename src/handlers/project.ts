import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface LeadUser {
  displayName?: string
}

interface ProjectData {
  key?: string
  name?: string
  description?: string
  projectTypeKey?: string
  style?: string
  lead?: LeadUser
}

interface ListProjectsResponse {
  total?: number
  values?: ProjectData[]
}

interface ComponentData {
  id?: string
  name?: string
  description?: string
  lead?: LeadUser
}

interface VersionData {
  id?: string
  name?: string
  released?: boolean
  archived?: boolean
  releaseDate?: string
  description?: string
}

interface StatusItem {
  id: string
  name?: string
  statusCategory?: { name?: string }
}

interface IssueTypeStatusMapping {
  id?: string
  name?: string
  statuses?: StatusItem[]
}

function formatProjectItem(p: ProjectData): string {
  const key = p.key || 'N/A'
  const name = p.name || 'Unnamed'
  const lead = p.lead?.displayName || 'No Owner'
  const type = p.projectTypeKey || 'Unknown'
  return `- [${key}] ${name} (Type: ${type}, Lead: ${lead})`
}

/**
 * 1. List all projects in a paginated way
 * GET /rest/api/3/project/search
 */
export async function handleListProjects(args: {
  startAt?: number
  maxResults?: number
  query?: string
  orderBy?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    query: args.query,
    orderBy: args.orderBy,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/project/search'), params)
  const data = await makeRequest<ListProjectsResponse>(url)

  const total = data.total ?? 0
  const projects = data.values || []

  let text = `Projects (showing ${projects.length} of ${total}):\n`
  if (projects.length === 0) {
    text += 'No projects found.'
  } else {
    text += projects.map(formatProjectItem).join('\n')
  }

  return { text, data }
}

/**
 * 2. Get project details by key or ID
 * GET /rest/api/3/project/{projectIdOrKey}
 */
export async function handleGetProject(args: {
  projectIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/project/${args.projectIdOrKey}`)
  const data = await makeRequest<ProjectData>(url)

  const key = data.key || args.projectIdOrKey
  const name = data.name || 'Unnamed'
  const desc = data.description || ''
  const lead = data.lead?.displayName || 'Unknown'
  const type = data.projectTypeKey || 'Unknown'
  const style = data.style || 'classic'

  let text = `Project [${key}]: ${name}
- Style: ${style}
- Type: ${type}
- Lead: ${lead}`

  if (desc) {
    text += `\n- Description: ${desc}`
  }

  return { text, data }
}

function formatComponentItem(c: ComponentData): string {
  const lead = c.lead?.displayName ? ` | Lead: ${c.lead.displayName}` : ''
  const desc = c.description ? ` - ${c.description}` : ''
  return `- "${c.name || 'Unnamed'}" (ID: ${c.id || 'N/A'}${lead})${desc}`
}

/**
 * 3. List components in a project
 * GET /rest/api/3/project/{projectIdOrKey}/components
 */
export async function handleGetProjectComponents(args: {
  projectIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(
    `/rest/api/3/project/${args.projectIdOrKey}/components`
  )
  const data = await makeRequest<ComponentData[]>(url)

  const components = Array.isArray(data) ? data : []
  let text = `Components in Project ${args.projectIdOrKey} (Total: ${components.length}):\n`
  if (components.length === 0) {
    text += 'No components found.'
  } else {
    text += components.map(formatComponentItem).join('\n')
  }

  return { text, data }
}

function formatVersionItem(v: VersionData): string {
  const status = v.released
    ? 'Released'
    : v.archived
      ? 'Archived'
      : 'Unreleased'
  const date = v.releaseDate ? ` | Release Date: ${v.releaseDate}` : ''
  const desc = v.description ? ` - ${v.description}` : ''
  return `- "${v.name || 'Unnamed'}" (Status: ${status}${date})${desc}`
}

/**
 * 4. List versions/releases in a project
 * GET /rest/api/3/project/{projectIdOrKey}/versions
 */
export async function handleGetProjectVersions(args: {
  projectIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/project/${args.projectIdOrKey}/versions`)
  const data = await makeRequest<VersionData[]>(url)

  const versions = Array.isArray(data) ? data : []
  let text = `Versions in Project ${args.projectIdOrKey} (Total: ${versions.length}):\n`
  if (versions.length === 0) {
    text += 'No versions found.'
  } else {
    text += versions.map(formatVersionItem).join('\n')
  }

  return { text, data }
}

function formatStatus(s: StatusItem): string {
  const cat = s.statusCategory?.name
    ? ` [Category: ${s.statusCategory.name}]`
    : ''
  return `${s.name || 'Unknown'} (${s.id})${cat}`
}

function formatIssueTypeStatusMapping(it: IssueTypeStatusMapping): string {
  const typeName = it.name || 'Unknown Type'
  const statuses = (it.statuses || []).map(formatStatus).join(', ')
  return `- **${typeName}**:\n  Statuses: ${statuses || 'No statuses available'}`
}

/**
 * 5. List issue type to status mapping for a project
 * GET /rest/api/3/project/{projectIdOrKey}/statuses
 */
export async function handleGetProjectStatuses(args: {
  projectIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/project/${args.projectIdOrKey}/statuses`)
  const data = await makeRequest<IssueTypeStatusMapping[]>(url)

  const issueTypes = Array.isArray(data) ? data : []
  let text = `Issue Type Status Mappings for Project ${args.projectIdOrKey}:\n`
  if (issueTypes.length === 0) {
    text += 'No mappings found.'
  } else {
    text += issueTypes.map(formatIssueTypeStatusMapping).join('\n\n')
  }

  return { text, data }
}
