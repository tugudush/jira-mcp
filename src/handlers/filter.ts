import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'

interface FilterOwner {
  accountId: string
  displayName: string
}

interface FilterData {
  id: string
  name: string
  description?: string
  jql?: string
  viewUrl?: string
  searchUrl?: string
  favourite?: boolean
  owner?: FilterOwner
}

interface FilterPaginated {
  startAt: number
  maxResults: number
  total: number
  isLast?: boolean
  values: FilterData[]
}

/**
 * List / search saved filters.
 */
export async function handleListFilters(args: {
  filterName?: string
  accountId?: string
  ownerAccountId?: string
  orderBy?: string
  startAt?: number
  maxResults?: number
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    filterName: args.filterName,
    accountId: args.accountId,
    owner: args.ownerAccountId,
    orderBy: args.orderBy,
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
    expand: args.expand,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/filter/search'), params)
  const data = await makeRequest<FilterPaginated>(url)

  const filters = data.values || []
  const count = filters.length
  const total = data.total ?? count

  let text = `Saved Filters (showing ${count} of ${total}):\n`
  if (filters.length === 0) {
    text += 'No filters found.'
  } else {
    text += filters
      .map((f) => {
        const ownerName = f.owner?.displayName
          ? ` | Owner: ${f.owner.displayName}`
          : ''
        const fav = f.favourite ? ' [⭐]' : ''
        return `- [ID: ${f.id}] "${f.name}"${fav}${ownerName}\n  JQL: ${f.jql || 'None'}`
      })
      .join('\n')
  }

  return { text, data }
}

/**
 * Retrieve detailed info for a single filter.
 */
export async function handleGetFilter(args: {
  id: number
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    expand: args.expand,
  }

  const url = addQueryParams(
    buildApiUrl(`/rest/api/3/filter/${args.id}`),
    params
  )
  const data = await makeRequest<FilterData>(url)

  const owner = data.owner?.displayName
    ? `\n- Owner: ${data.owner.displayName} (${data.owner.accountId})`
    : ''
  const fav = data.favourite ? ' (Favorited)' : ''
  const text = `Filter [${data.id}]: ${data.name}${fav}${owner}
- JQL: ${data.jql || 'None'}
- Description: ${data.description || 'No description'}`

  return { text, data }
}

/**
 * Retrieve favorite filters of the current user.
 */
export async function handleGetFavoriteFilters(args: {
  expand?: string
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    expand: args.expand,
  }

  const url = addQueryParams(
    buildApiUrl('/rest/api/3/filter/favourite'),
    params
  )
  const data = await makeRequest<FilterData[]>(url)

  let text = `Favorite Filters (count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No favorite filters found.'
  } else {
    text += data
      .map((f) => {
        const ownerName = f.owner?.displayName
          ? ` | Owner: ${f.owner.displayName}`
          : ''
        return `- [ID: ${f.id}] "${f.name}"${ownerName}\n  JQL: ${f.jql || 'None'}`
      })
      .join('\n')
  }

  return { text, data }
}
