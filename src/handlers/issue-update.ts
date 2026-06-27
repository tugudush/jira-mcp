import {
  addQueryParams,
  buildApiUrl,
  makeIssueUpdateRequest,
  makeRequest,
} from '../api.js'
import { IssueUpdatePermissionError } from '../errors.js'

interface JiraUserIdentity {
  accountId?: string
  displayName?: string
}

interface IssueUpdateFields {
  summary?: string
  reporter?: JiraUserIdentity | null
  assignee?: JiraUserIdentity | null
}

interface IssueForUpdate {
  key?: string
  fields?: IssueUpdateFields
}

interface AdfTextNode {
  type: 'text'
  text: string
}

interface AdfParagraphNode {
  type: 'paragraph'
  content?: AdfTextNode[]
}

interface AdfDocument {
  type: 'doc'
  version: 1
  content: AdfParagraphNode[]
}

interface IssueTextUpdateArgs extends Record<string, unknown> {
  issueIdOrKey: string
  title?: string
  description?: string
}

type IssueActorRole = 'reporter' | 'assignee'

function validateUpdateArgs(args: IssueTextUpdateArgs): void {
  const hasTitle = args.title !== undefined
  const hasDescription = args.description !== undefined

  if (!hasTitle && !hasDescription) {
    throw new Error('Provide title, description, or both.')
  }

  if (hasTitle && args.title?.trim().length === 0) {
    throw new Error('Issue title must not be empty.')
  }
}

function buildPlainTextAdf(text: string): AdfDocument {
  const paragraph: AdfParagraphNode = { type: 'paragraph' }
  if (text.length > 0) {
    paragraph.content = [{ type: 'text', text }]
  }

  return {
    type: 'doc',
    version: 1,
    content: [paragraph],
  }
}

function sameAccount(
  currentUser: JiraUserIdentity,
  issueUser?: JiraUserIdentity | null
): boolean {
  return Boolean(
    currentUser.accountId && issueUser?.accountId === currentUser.accountId
  )
}

function resolveActorRole(
  currentUser: JiraUserIdentity,
  fields?: IssueUpdateFields
): IssueActorRole | null {
  if (sameAccount(currentUser, fields?.reporter)) return 'reporter'
  if (sameAccount(currentUser, fields?.assignee)) return 'assignee'
  return null
}

function requireAllowedActor(
  issueIdOrKey: string,
  currentUser: JiraUserIdentity,
  issue: IssueForUpdate
): IssueActorRole {
  const actorRole = resolveActorRole(currentUser, issue.fields)
  if (!actorRole) {
    throw new IssueUpdatePermissionError(issue.key ?? issueIdOrKey)
  }
  return actorRole
}

function buildIssueLookupUrl(issueIdOrKey: string): string {
  const encodedIssueIdOrKey = encodeURIComponent(issueIdOrKey)
  return addQueryParams(
    buildApiUrl(`/rest/api/3/issue/${encodedIssueIdOrKey}`),
    {
      fields: 'summary,reporter,assignee',
    }
  )
}

function buildUpdateFields(args: IssueTextUpdateArgs): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (args.title !== undefined) {
    fields.summary = args.title
  }
  if (args.description !== undefined) {
    fields.description = buildPlainTextAdf(args.description)
  }
  return fields
}

function getUpdatedFieldNames(fields: Record<string, unknown>): string[] {
  const updatedFields: string[] = []
  if (fields.summary !== undefined) updatedFields.push('title')
  if (fields.description !== undefined) updatedFields.push('description')
  return updatedFields
}

/**
 * Update only an issue title (Jira summary) and/or plain-text description.
 */
export async function handleUpdateIssueText(
  args: IssueTextUpdateArgs
): Promise<{ text: string; data: unknown }> {
  validateUpdateArgs(args)

  const currentUser = await makeRequest<JiraUserIdentity>(
    buildApiUrl('/rest/api/3/myself')
  )
  const issue = await makeRequest<IssueForUpdate>(
    buildIssueLookupUrl(args.issueIdOrKey)
  )
  const actorRole = requireAllowedActor(args.issueIdOrKey, currentUser, issue)

  const fields = buildUpdateFields(args)
  const issueKey = issue.key ?? args.issueIdOrKey
  const encodedIssueIdOrKey = encodeURIComponent(args.issueIdOrKey)
  const response = await makeIssueUpdateRequest(
    buildApiUrl(`/rest/api/3/issue/${encodedIssueIdOrKey}`),
    {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    }
  )

  const updatedFields = getUpdatedFieldNames(fields)
  const text =
    `Updated issue ${issueKey}: ${updatedFields.join(', ')}. ` +
    `Permission check passed because the authenticated user is the ${actorRole}.`

  return {
    text,
    data: {
      issueIdOrKey: args.issueIdOrKey,
      issueKey,
      updatedFields,
      actorRole,
      response,
    },
  }
}
