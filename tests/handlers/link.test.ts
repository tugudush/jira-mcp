import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetIssueLinks } from '../../src/handlers/link.js'
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

describe('link handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleGetIssueLinks', () => {
    it('returns both outward and inward links', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10001',
        key: 'PROJ-1',
        fields: {
          issuelinks: [
            {
              id: '20001',
              type: {
                id: '10000',
                name: 'Blocks',
                inward: 'is blocked by',
                outward: 'blocks',
              },
              outwardIssue: {
                id: '10002',
                key: 'PROJ-2',
                fields: {
                  summary: 'Outward target',
                  status: { name: 'To Do' },
                },
              },
            },
            {
              id: '20002',
              type: {
                id: '10001',
                name: 'Duplicate',
                inward: 'duplicates',
                outward: 'is duplicated by',
              },
              inwardIssue: {
                id: '10003',
                key: 'PROJ-3',
                fields: {
                  summary: 'Inward target',
                  status: { name: 'Closed' },
                },
              },
            },
          ],
        },
      })

      const res = await handleGetIssueLinks({ issueIdOrKey: 'PROJ-1' })
      expect(res.text).toContain('Issue Links for [PROJ-1] (count: 2)')
      expect(res.text).toContain(
        '→ [PROJ-2] Outward target (blocks, Status: To Do)'
      )
      expect(res.text).toContain(
        '← [PROJ-3] Inward target (duplicates, Status: Closed)'
      )
    })

    it('returns empty state when no links', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10001',
        key: 'PROJ-1',
        fields: { issuelinks: [] },
      })

      const res = await handleGetIssueLinks({ issueIdOrKey: 'PROJ-1' })
      expect(res.text).toContain('Issue Links for [PROJ-1] (count: 0)')
      expect(res.text).toContain('No links found.')
    })

    it('handles missing issuelinks field gracefully', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10001',
        key: 'PROJ-1',
        fields: {},
      })

      const res = await handleGetIssueLinks({ issueIdOrKey: 'PROJ-1' })
      expect(res.text).toContain('count: 0')
      expect(res.text).toContain('No links found.')
    })

    it('falls back to link type name when direction label missing', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10001',
        key: 'PROJ-1',
        fields: {
          issuelinks: [
            {
              id: '20001',
              type: { id: '10000', name: 'Relates' },
              outwardIssue: {
                id: '10002',
                key: 'PROJ-2',
                fields: { summary: 'Related issue', status: { name: 'Open' } },
              },
            },
          ],
        },
      })

      const res = await handleGetIssueLinks({ issueIdOrKey: 'PROJ-1' })
      expect(res.text).toContain(
        '→ [PROJ-2] Related issue (Relates, Status: Open)'
      )
    })

    it('falls back to id when key missing on linked issue', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10001',
        key: 'PROJ-1',
        fields: {
          issuelinks: [
            {
              id: '20001',
              type: {
                id: '10000',
                name: 'Blocks',
                inward: 'is blocked by',
                outward: 'blocks',
              },
              outwardIssue: {
                id: '9999',
                fields: { status: { name: 'Open' } },
              },
            },
          ],
        },
      })

      const res = await handleGetIssueLinks({ issueIdOrKey: 'PROJ-1' })
      expect(res.text).toContain('→ [9999] No Summary (blocks, Status: Open)')
    })
  })
})
