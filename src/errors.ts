/**
 * Custom error classes for better error handling and user feedback.
 */

export class JiraApiError extends Error {
  status: number
  url?: string
  body?: unknown

  constructor(status: number, message: string, url?: string, body?: unknown) {
    super(message)
    this.name = 'JiraApiError'
    this.status = status
    this.url = url
    this.body = body

    // Maintain stable stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class AuthenticationError extends JiraApiError {
  constructor(
    message = 'Unauthorized: Please check your JIRA_EMAIL and JIRA_API_TOKEN.',
    url?: string,
    body?: unknown
  ) {
    super(401, message, url, body)
    this.name = 'AuthenticationError'
  }
}

export class ForbiddenError extends JiraApiError {
  constructor(
    message = 'Forbidden: Ensure the authenticated user has correct permissions.',
    url?: string,
    body?: unknown
  ) {
    super(403, message, url, body)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends JiraApiError {
  constructor(
    message = 'Not Found: The requested resource could not be found.',
    url?: string,
    body?: unknown
  ) {
    super(404, message, url, body)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends JiraApiError {
  suggestion: string

  constructor(
    message = 'Rate Limited: Too many requests sent to the Jira API.',
    url?: string,
    body?: unknown
  ) {
    super(429, message, url, body)
    this.name = 'RateLimitError'
    this.suggestion = 'Please wait a moment before sending more requests.'
  }
}

export class IssueUpdateDisabledError extends Error {
  suggestion: string

  constructor() {
    super('Scoped issue updates are disabled.')
    this.name = 'IssueUpdateDisabledError'
    this.suggestion =
      "To enable title/description updates, set JIRA_ALLOW_ISSUE_UPDATES=true in the MCP configuration's env block."

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class IssueUpdatePermissionError extends Error {
  suggestion: string

  constructor(issueIdOrKey: string) {
    super(
      `Issue "${issueIdOrKey}" can only be updated by its reporter or assignee.`
    )
    this.name = 'IssueUpdatePermissionError'
    this.suggestion =
      'Ask the reporter or assignee to make the change, or have a Jira admin update the issue assignment/reportership first.'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Parses Jira Cloud REST API v3 error messages.
 * Jira typically returns errors in:
 * - errorMessages: string[]
 * - errors: Record<string, string>
 */
export function extractJiraErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined

  const messages: string[] = []
  const bodyObj = body as Record<string, unknown>

  if (Array.isArray(bodyObj.errorMessages)) {
    bodyObj.errorMessages.forEach((msg) => {
      if (typeof msg === 'string') messages.push(msg)
    })
  } else if (typeof bodyObj.errorMessages === 'string') {
    messages.push(bodyObj.errorMessages)
  }

  if (bodyObj.errors && typeof bodyObj.errors === 'object') {
    Object.entries(bodyObj.errors).forEach(([field, msg]) => {
      if (typeof msg === 'string') {
        messages.push(`${field}: ${msg}`)
      } else if (msg && typeof msg === 'object') {
        const msgObj = msg as Record<string, unknown>
        if (typeof msgObj.message === 'string') {
          messages.push(`${field}: ${msgObj.message}`)
        }
      }
    })
  }

  // Fallback to basic message if any
  if (typeof bodyObj.message === 'string') {
    messages.push(bodyObj.message)
  }

  return messages.length > 0 ? messages.join('; ') : undefined
}

/**
 * Creates the appropriate typed error based on HTTP status code and response payload.
 */
export function createApiError(
  status: number,
  statusText: string,
  url?: string,
  body?: unknown
): JiraApiError {
  const extracted = extractJiraErrorMessage(body)
  const detail = extracted ? ` - ${extracted}` : ''
  const message = `${status} ${statusText}${detail}`

  switch (status) {
    case 401:
      return new AuthenticationError(
        `Unauthorized: Invalid credentials.${detail}`,
        url,
        body
      )
    case 403:
      return new ForbiddenError(
        `Forbidden: Correct permissions required.${detail}`,
        url,
        body
      )
    case 404:
      return new NotFoundError(
        `Not Found: The resource does not exist or you lack access.${detail}`,
        url,
        body
      )
    case 429:
      return new RateLimitError(
        `Rate Limited: Too many calls.${detail}`,
        url,
        body
      )
    default:
      return new JiraApiError(status, message, url, body)
  }
}
