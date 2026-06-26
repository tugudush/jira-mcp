import { buildApiUrl, makeRequest } from '../api.js'

interface IssueLinkType {
  id?: string
  name?: string
  inward?: string
  outward?: string
}

interface LinkedIssueRef {
  id: string
  key?: string
  fields?: {
    summary?: string
    status?: { name: string }
  }
}

interface IssueLinkData {
  id?: string
  type?: IssueLinkType
  outwardIssue?: LinkedIssueRef
  inwardIssue?: LinkedIssueRef
}

interface IssueLinkFetchedFields {
  issuelinks?: IssueLinkData[]
}

interface IssueFetchedData {
  id?: string
  key?: string
  fields?: IssueLinkFetchedFields
}

interface LinkDirectionConfig {
  arrow: string
  relationKey: 'outward' | 'inward'
}

function getDirectionConfig(
  direction: 'outward' | 'inward'
): LinkDirectionConfig {
  return {
    arrow: direction === 'outward' ? '→' : '←',
    relationKey: direction,
  }
}

function resolveRelation(
  type: IssueLinkType | undefined,
  direction: 'outward' | 'inward'
): string {
  const directional = type?.[direction]
  if (directional) return directional
  return type?.name ?? 'related'
}

function resolveKey(target: LinkedIssueRef | undefined): string {
  return target?.key ?? target?.id ?? 'unknown'
}

function buildLinkLine(
  link: IssueLinkData,
  direction: 'outward' | 'inward'
): string {
  const config = getDirectionConfig(direction)
  const target = direction === 'outward' ? link.outwardIssue : link.inwardIssue
  const relation = resolveRelation(link.type, config.relationKey)
  const key = resolveKey(target)
  const summary = target?.fields?.summary ?? 'No Summary'
  const status = target?.fields?.status?.name ?? 'Unknown'
  return `  ${config.arrow} [${key}] ${summary} (${relation}, Status: ${status})`
}

function collectLinks(
  lines: string[],
  links: IssueLinkData[] | undefined
): void {
  if (!links) return
  for (const link of links) {
    if (link.outwardIssue) {
      lines.push(buildLinkLine(link, 'outward'))
    }
    if (link.inwardIssue) {
      lines.push(buildLinkLine(link, 'inward'))
    }
  }
}

/**
 * Retrieve outward + inward issue links for an issue.
 *
 * Note: Jira Cloud does not expose a dedicated "issue links" endpoint. Links are
 * accessed via the issue resource using `fields=issuelinks` and we project both
 * outward and inward directions here.
 */
export async function handleGetIssueLinks(args: {
  issueIdOrKey: string
}): Promise<{ text: string; data: unknown }> {
  const url = buildApiUrl(
    `/rest/api/3/issue/${args.issueIdOrKey}?fields=issuelinks`
  )
  const data = await makeRequest<IssueFetchedData>(url)

  const issueKey = data.key ?? args.issueIdOrKey
  const links = data.fields?.issuelinks ?? []

  let text = `Issue Links for [${issueKey}] (count: ${links.length}):\n`
  if (links.length === 0) {
    text += 'No links found.'
  } else {
    const lines: string[] = []
    collectLinks(lines, links)
    text += lines.join('\n')
  }

  return { text, data }
}
