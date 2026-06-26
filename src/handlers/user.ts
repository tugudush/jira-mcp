import { buildApiUrl, makeRequest, addQueryParams } from '../api.js'
import { JiraUser } from '../types.js'

/**
 * Get information about the currently authenticated user.
 */
export async function handleGetCurrentUser(): Promise<{
  text: string
  data: unknown
}> {
  const url = buildApiUrl('/rest/api/3/myself')
  const data = await makeRequest<JiraUser>(url)

  const text = `Authenticated User:
- Name: ${data.displayName}
- Account ID: ${data.accountId}
- Email: ${data.emailAddress || 'N/A'}
- Active: ${data.active}
- Time Zone: ${data.timeZone}
- Locale: ${data.locale}`

  return { text, data }
}

/**
 * Get detailed information about a single user by account ID.
 */
export async function handleGetUser(args: {
  accountId: string
}): Promise<{ text: string; data: unknown }> {
  const url = addQueryParams(buildApiUrl('/rest/api/3/user'), {
    accountId: args.accountId,
  })
  const data = await makeRequest<JiraUser>(url)

  const text = `User Profile:
- Name: ${data.displayName}
- Account ID: ${data.accountId}
- Email: ${data.emailAddress || 'N/A'}
- Active: ${data.active}
- Time Zone: ${data.timeZone}
- Locale: ${data.locale}`

  return { text, data }
}

/**
 * Search users by query string.
 */
export async function handleSearchUsers(args: {
  query: string
  startAt?: number
  maxResults?: number
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    query: args.query,
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
  }

  const url = addQueryParams(buildApiUrl('/rest/api/3/user/search'), params)
  const data = await makeRequest<JiraUser[]>(url)

  let text = `Search Users Results (query: "${args.query}", count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No users found.'
  } else {
    text += data
      .map(
        (user) =>
          `- [${user.accountId}] ${user.displayName} (${user.emailAddress || 'No Email'})`
      )
      .join('\n')
  }

  return { text, data }
}

/**
 * Get users assignable to projects or issues.
 */
export async function handleGetAssignableUsers(args: {
  query?: string
  projectKey?: string
  issueKey?: string
  startAt?: number
  maxResults?: number
}): Promise<{ text: string; data: unknown }> {
  const params: Record<string, unknown> = {
    query: args.query,
    project: args.projectKey,
    issueKey: args.issueKey,
    startAt: args.startAt ?? 0,
    maxResults: args.maxResults ?? 50,
  }

  const url = addQueryParams(
    buildApiUrl('/rest/api/3/user/assignable/search'),
    params
  )
  const data = await makeRequest<JiraUser[]>(url)

  let text = `Assignable Users (count: ${data.length}):\n`
  if (data.length === 0) {
    text += 'No assignable users found.'
  } else {
    text += data
      .map(
        (user) =>
          `- [${user.accountId}] ${user.displayName} (${user.emailAddress || 'No Email'})`
      )
      .join('\n')
  }

  return { text, data }
}
