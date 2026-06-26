/**
 * Jira API configuration and request handling with Basic Auth, timeouts, and retries.
 */

import { loadConfig } from './config.js'
import { createApiError, JiraApiError, WriteDisabledError } from './errors.js'
import { VERSION } from './generated/version.js'

// Sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Build authentication headers based on credentials.
 */
export function buildAuthHeaders(): Record<string, string> {
  const config = loadConfig()
  const credentials = `${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`
  const base64Str = Buffer.from(credentials).toString('base64')
  return {
    Authorization: `Basic ${base64Str}`,
  }
}

/**
 * Build standard headers for Jira REST API v3.
 * @param accept - Accept header value (default: 'application/json')
 * @returns Complete headers object
 */
export function buildRequestHeaders(
  accept = 'application/json'
): Record<string, string> {
  return {
    Accept: accept,
    'User-Agent': `jira-mcp/${VERSION}`,
    ...buildAuthHeaders(),
  }
}

/**
 * Check if the HTTP status indicates a retryable, transient error.
 */
function isRetryableError(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

/**
 * Build complete URL for Jira endpoints.
 */
export function buildApiUrl(endpoint: string): string {
  const config = loadConfig()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${config.JIRA_BASE_URL}${path}`
}

/**
 * Helper to add query parameters to a URL.
 */
export function addQueryParams(
  url: string,
  params: Record<string, unknown>
): string {
  const urlObj = new URL(url)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, String(value))
    }
  })
  return urlObj.toString()
}

/**
 * Internal single fetch attempt logic with abort controller timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  } catch (err: unknown) {
    clearTimeout(id)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms.`, {
        cause: err,
      })
    }
    throw err
  }
}

/**
 * Parses response error content safely.
 */
async function parseErrorResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    try {
      return { message: await response.text() }
    } catch {
      return null
    }
  }
}

/**
 * Performs a single request attempt, raising configured api errors on failure.
 */
async function executeRequestAttempt(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const response = await fetchWithTimeout(url, options, timeoutMs)
  if (response.ok) {
    return response
  }
  const errorBody = await parseErrorResponseBody(response)
  throw createApiError(response.status, response.statusText, url, errorBody)
}

/**
 * Log helper for debug modes.
 */
function logDebug(message: string, ...args: unknown[]): void {
  try {
    const config = loadConfig()
    if (config.JIRA_DEBUG) {
      console.error(`[jira-mcp] ${message}`, ...args)
    }
  } catch {
    // If config hasn't loaded yet
  }
}

/**
 * Determine whether a request attempt is retryable.
 */
function shouldRetryAttempt(
  err: unknown,
  attempt: number,
  maxAttempts: number
): boolean {
  if (attempt >= maxAttempts) return false
  if (err instanceof JiraApiError) {
    return isRetryableError(err.status)
  }
  return true
}

/**
 * Ensure an error is an instance of Error.
 */
function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

/**
 * Core generalized fetch implementation with retry, timeout & error parsing.
 */
async function performRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = loadConfig()
  const timeoutMs = config.JIRA_REQUEST_TIMEOUT_MS
  const retryAttempts = 3
  let delay = 1000 // Exponential backoff initial delay

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      logDebug(
        `HTTP ${options.method || 'GET'} ${url} (Attempt ${attempt}/${retryAttempts})`
      )
      return await executeRequestAttempt(url, options, timeoutMs)
    } catch (err: unknown) {
      const errorToThrow = normalizeError(err)
      lastError = errorToThrow

      if (shouldRetryAttempt(err, attempt, retryAttempts)) {
        logDebug(
          `Transient failure. Retrying in ${delay}ms...`,
          errorToThrow.message
        )
        await sleep(delay)
        delay *= 2
        continue
      }

      throw lastError
    }
  }

  throw lastError || new Error('Request failed after all retries.')
}

/**
 * Make an authenticated READ request (GET) returning typed JSON data.
 */
export async function makeRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toString().toUpperCase()
  if (method !== 'GET' && !(method === 'POST' && url.includes('/search'))) {
    throw new Error(
      `Only GET requests are allowed in makeRequest. Use makeWriteRequest for mutations.`
    )
  }

  const extraHeaders: Record<string, string> = {}
  if (method === 'POST') {
    extraHeaders['Content-Type'] = 'application/json'
  }

  const headers = {
    ...buildRequestHeaders('application/json'),
    ...extraHeaders,
    ...((options.headers as Record<string, string>) || {}),
  }

  const response = await performRequest(url, {
    ...options,
    method,
    headers,
  })

  return (await response.json()) as T
}

/**
 * Make an authenticated request that returns raw text.
 */
export async function makeTextRequest(
  url: string,
  options: RequestInit = {}
): Promise<string> {
  const method = (options.method || 'GET').toString().toUpperCase()
  if (method !== 'GET') {
    throw new Error(`Only GET requests are allowed in makeTextRequest.`)
  }

  const headers = {
    ...buildRequestHeaders('text/plain'),
    ...((options.headers as Record<string, string>) || {}),
  }

  const response = await performRequest(url, {
    ...options,
    method,
    headers,
  })

  return await response.text()
}

/**
 * Safely parses write response payload (handles JSON, empty, plain text, 204).
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  try {
    const text = await response.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

/**
 * Make an authenticated WRITE request (POST/PUT/DELETE) returning typed JSON data.
 * Guarded by JIRA_ALLOW_WRITES check.
 */
export async function makeWriteRequest<T = unknown>(
  url: string,
  toolName: string,
  options: RequestInit = {}
): Promise<T> {
  const config = loadConfig()
  if (!config.JIRA_ALLOW_WRITES) {
    throw new WriteDisabledError(toolName)
  }

  const method = (options.method || 'POST').toString().toUpperCase()
  if (method === 'GET') {
    throw new Error(
      `GET requests should use makeRequest, not makeWriteRequest.`
    )
  }

  const headers = {
    ...buildRequestHeaders('application/json'),
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  const response = await performRequest(url, {
    ...options,
    method,
    headers,
  })

  return await parseJsonResponse<T>(response)
}
