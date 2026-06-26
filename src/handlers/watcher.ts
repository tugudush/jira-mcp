import { buildApiUrl, makeRequest } from '../api.js'

interface WatcherEntry {
  displayName?: string
  accountId: string
}

interface WatchersResponse {
  isWatching?: boolean
  watchCount?: number
  watchers?: WatcherEntry[]
}

function formatWatcher(w: WatcherEntry): string {
  return `- Name: ${w.displayName || 'Unknown'} (Account ID: ${w.accountId})`
}

/**
 * List watchers of an issue.
 *
 * Returns the current authenticated user's watch state, the total watch count,
 * and the list of users watching the issue.
 */
export async function handleGetIssueWatchers(args: {
  issueIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(`/rest/api/3/issue/${args.issueIdOrKey}/watchers`)
  const data = await makeRequest<WatchersResponse>(url)

  const isWatching = data.isWatching ?? false
  const watchCount = data.watchCount ?? 0
  const watchers = data.watchers || []

  let text = `Watchers for ${args.issueIdOrKey} (Watch Count: ${watchCount}, You Watching: ${isWatching}):\n`
  if (watchers.length === 0) {
    text += 'No watchers.'
  } else {
    text += watchers.map(formatWatcher).join('\n')
  }

  return { text, data }
}
