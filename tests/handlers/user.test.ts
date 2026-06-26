import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleGetCurrentUser,
  handleGetUser,
  handleSearchUsers,
  handleGetAssignableUsers,
} from '../../src/handlers/user.js'
import * as api from '../../src/api.js'

vi.mock('../../src/api.js', () => {
  return {
    buildApiUrl: (endpoint: string) =>
      `https://mock-jira.atlassian.net${endpoint}`,
    addQueryParams: (url: string, params: Record<string, unknown>) => {
      const q = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      return q ? `${url}?${q}` : url
    },
    makeRequest: vi.fn(),
  }
})

describe('user handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleGetCurrentUser', () => {
    it('returns information about currently authenticated user', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        displayName: 'Jerome Gomez',
        accountId: 'acc123',
        emailAddress: 'jerome@email.com',
        active: true,
        timeZone: 'UTC',
        locale: 'en_US',
      })

      const res = await handleGetCurrentUser()
      expect(res.text).toContain('Authenticated User:')
      expect(res.text).toContain('- Name: Jerome Gomez')
      expect(res.text).toContain('- Account ID: acc123')
      expect(res.text).toContain('- Email: jerome@email.com')
    })
  })

  describe('handleGetUser', () => {
    it('returns user profile details', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        displayName: 'John Doe',
        accountId: 'acc456',
        emailAddress: 'john@doe.com',
        active: true,
        timeZone: 'EST',
        locale: 'en_GB',
      })

      const res = await handleGetUser({ accountId: 'acc456' })
      expect(res.text).toContain('User Profile:')
      expect(res.text).toContain('- Name: John Doe')
      expect(res.text).toContain('- Account ID: acc456')
      expect(res.text).toContain('- Email: john@doe.com')
    })
  })

  describe('handleSearchUsers', () => {
    it('returns search results list', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          accountId: 'acc789',
          displayName: 'Jane Tester',
          emailAddress: 'jane@test.com',
        },
      ])

      const res = await handleSearchUsers({ query: 'Jane' })
      expect(res.text).toContain(
        'Search Users Results (query: "Jane", count: 1)'
      )
      expect(res.text).toContain('- [acc789] Jane Tester (jane@test.com)')
    })

    it('returns empty message if no users found', async () => {
      mockMakeRequest.mockResolvedValueOnce([])
      const res = await handleSearchUsers({ query: 'Stranger' })
      expect(res.text).toContain('No users found.')
    })
  })

  describe('handleGetAssignableUsers', () => {
    it('returns list of assignable users', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          accountId: 'acc100',
          displayName: 'Assignee A',
          emailAddress: 'a@jira.com',
        },
      ])

      const res = await handleGetAssignableUsers({ projectKey: 'PROJ' })
      expect(res.text).toContain('Assignable Users (count: 1)')
      expect(res.text).toContain('- [acc100] Assignee A (a@jira.com)')
    })
  })
})
