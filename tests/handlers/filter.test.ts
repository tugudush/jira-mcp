import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListFilters,
  handleGetFilter,
  handleGetFavoriteFilters,
} from '../../src/handlers/filter.js'
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

describe('filter handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListFilters', () => {
    it('lists saved filters successfully', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 10,
        values: [
          {
            id: '10001',
            name: 'My Open Bugs',
            jql: 'project = MY AND issuetype = Bug AND status = Open',
            favourite: true,
            owner: { displayName: 'Alice', accountId: 'aliceAccountId' },
          },
        ],
      })

      const res = await handleListFilters({})
      expect(res.text).toContain('Saved Filters (showing 1 of 10)')
      expect(res.text).toContain(
        '- [ID: 10001] "My Open Bugs" [⭐] | Owner: Alice'
      )
      expect(res.text).toContain(
        'JQL: project = MY AND issuetype = Bug AND status = Open'
      )
    })

    it('handles empty filters list', async () => {
      mockMakeRequest.mockResolvedValueOnce({ values: [] })
      const res = await handleListFilters({})
      expect(res.text).toContain('No filters found.')
    })
  })

  describe('handleGetFilter', () => {
    it('retrieves detailed filter details', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '20002',
        name: 'Done Issues',
        jql: 'status = Done',
        description: 'Issues that are done.',
        favourite: false,
        owner: { displayName: 'Bob', accountId: 'bobAccountId' },
      })

      const res = await handleGetFilter({ id: 20002 })
      expect(res.text).toContain('Filter [20002]: Done Issues')
      expect(res.text).toContain('- JQL: status = Done')
      expect(res.text).toContain('- Owner: Bob')
      expect(res.text).toContain('- Description: Issues that are done.')
    })
  })

  describe('handleGetFavoriteFilters', () => {
    it('returns favorited filters list', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: '30003',
          name: 'Critical Tasks',
          jql: 'priority = Critical',
          owner: { displayName: 'Admin', accountId: 'adminId' },
        },
      ])

      const res = await handleGetFavoriteFilters({})
      expect(res.text).toContain('Favorite Filters (count: 1)')
      expect(res.text).toContain(
        '- [ID: 30003] "Critical Tasks" | Owner: Admin'
      )
    })
  })
})
