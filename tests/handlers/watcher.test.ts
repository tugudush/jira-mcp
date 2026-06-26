import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetIssueWatchers } from '../../src/handlers/watcher.js'
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

describe('watcher handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleGetIssueWatchers', () => {
    it('returns watchers information', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        isWatching: true,
        watchCount: 2,
        watchers: [
          { displayName: 'Alice', accountId: 'acc-alice' },
          { displayName: 'Bob', accountId: 'acc-bob' },
        ],
      })

      const res = await handleGetIssueWatchers({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain('Watch Count: 2, You Watching: true')
      expect(res.text).toContain('- Name: Alice (Account ID: acc-alice)')
      expect(res.text).toContain('- Name: Bob (Account ID: acc-bob)')
    })

    it('returns empty state when no watchers', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        isWatching: false,
        watchCount: 0,
        watchers: [],
      })

      const res = await handleGetIssueWatchers({ issueIdOrKey: 'PROJ-999' })
      expect(res.text).toContain('Watch Count: 0, You Watching: false')
      expect(res.text).toContain('No watchers.')
    })

    it('handles missing optional fields gracefully', async () => {
      mockMakeRequest.mockResolvedValueOnce({})

      const res = await handleGetIssueWatchers({ issueIdOrKey: 'PROJ-100' })
      expect(res.text).toContain('Watch Count: 0, You Watching: false')
      expect(res.text).toContain('No watchers.')
    })
  })
})
