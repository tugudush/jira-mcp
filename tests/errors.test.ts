import { describe, it, expect } from 'vitest'
import {
  createApiError,
  extractJiraErrorMessage,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  WriteDisabledError,
} from '../src/errors.js'

describe('errors.ts unit tests', () => {
  describe('extractJiraErrorMessage', () => {
    it('returns undefined for null or empty body', () => {
      expect(extractJiraErrorMessage(null)).toBeUndefined()
      expect(extractJiraErrorMessage({})).toBeUndefined()
    })

    it('parses errorMessages array', () => {
      const body = {
        errorMessages: ['No permission', 'Sample error'],
      }
      expect(extractJiraErrorMessage(body)).toBe('No permission; Sample error')
    })

    it('parses errorMessages string', () => {
      const body = {
        errorMessages: 'Single error message',
      }
      expect(extractJiraErrorMessage(body)).toBe('Single error message')
    })

    it('parses errors dictionary with string messages', () => {
      const body = {
        errors: {
          summary: 'Summary is required',
          project: 'Project is invalid',
        },
      }
      expect(extractJiraErrorMessage(body)).toContain(
        'summary: Summary is required'
      )
      expect(extractJiraErrorMessage(body)).toContain(
        'project: Project is invalid'
      )
    })

    it('parses errors dictionary with object messages', () => {
      const body = {
        errors: {
          labels: { message: 'Labels array invalid' },
        },
      }
      expect(extractJiraErrorMessage(body)).toBe('labels: Labels array invalid')
    })

    it('parses general message field as fallback', () => {
      const body = {
        message: 'Network call interrupted',
      }
      expect(extractJiraErrorMessage(body)).toBe('Network call interrupted')
    })

    it('unifies diverse fields correctly', () => {
      const body = {
        errorMessages: ['Failure 1'],
        errors: {
          fieldX: 'Value invalid',
        },
        message: 'Fallback',
      }
      const res = extractJiraErrorMessage(body)
      expect(res).toContain('Failure 1')
      expect(res).toContain('fieldX: Value invalid')
      expect(res).toContain('Fallback')
    })
  })

  describe('createApiError mapping', () => {
    it('maps 401 to AuthenticationError', () => {
      const err = createApiError(401, 'Unauthorized', 'http://jira.com', {
        errorMessages: ['Token invalid'],
      })
      expect(err).toBeInstanceOf(AuthenticationError)
      expect(err.status).toBe(401)
      expect(err.message).toContain('Token invalid')
    })

    it('maps 403 to ForbiddenError', () => {
      const err = createApiError(403, 'Forbidden', 'http://jira.com', {
        errorMessages: ['Insufficient permission'],
      })
      expect(err).toBeInstanceOf(ForbiddenError)
      expect(err.status).toBe(403)
    })

    it('maps 404 to NotFoundError', () => {
      const err = createApiError(404, 'Not Found', 'http://jira.com')
      expect(err).toBeInstanceOf(NotFoundError)
      expect(err.status).toBe(404)
    })

    it('maps 429 to RateLimitError', () => {
      const err = createApiError(429, 'Too Many Requests', 'http://jira.com')
      expect(err).toBeInstanceOf(RateLimitError)
      expect(err.status).toBe(429)
      expect((err as RateLimitError).suggestion).toContain('wait')
    })

    it('maps any other code to JiraApiError', () => {
      const err = createApiError(
        500,
        'Internal Server Error',
        'http://jira.com'
      )
      expect(err).not.toBeInstanceOf(AuthenticationError)
      expect(err.status).toBe(500)
      expect(err.message).toContain('500 Internal Server Error')
    })
  })

  describe('WriteDisabledError', () => {
    it('contains the custom message and suggestion', () => {
      const err = new WriteDisabledError('jira_create_issue')
      expect(err.message).toContain(
        'Write tool "jira_create_issue" called but write operations are disabled.'
      )
      expect(err.suggestion).toContain('JIRA_ALLOW_WRITES=true')
    })
  })
})
