import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListDashboards,
  handleGetDashboard,
} from '../../src/handlers/dashboard.js'
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

describe('dashboard handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListDashboards', () => {
    it('lists dashboards with owner and sharing info', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
        values: [
          {
            id: '10100',
            name: 'Team Overview',
            view: '/dashboards/10100',
            sharing: { isPublic: true },
            owner: { accountId: 'acc-1', displayName: 'Alice' },
          },
          {
            id: '10101',
            name: 'My Private Board',
            view: '/dashboards/10101',
            sharing: { isPublic: false },
            owner: { accountId: 'acc-2', displayName: 'Bob' },
          },
        ],
      })

      const res = await handleListDashboards({})
      expect(res.text).toContain('Jira Dashboards (showing 2 of 2)')
      expect(res.text).toContain(
        '- [ID: 10100] "Team Overview" [Public] | Owner: Alice'
      )
      expect(res.text).toContain(
        '- [ID: 10101] "My Private Board" | Owner: Bob'
      )
    })

    it('returns empty state when no dashboards found', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        startAt: 0,
        maxResults: 50,
        total: 0,
        values: [],
      })

      const res = await handleListDashboards({})
      expect(res.text).toContain('No dashboards found.')
    })
  })

  describe('handleGetDashboard', () => {
    it('returns dashboard details with gadgets', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10100',
        name: 'Team Overview',
        view: '/dashboards/10100',
        description: 'High level overview',
        sharing: { isPublic: true },
        owner: { accountId: 'acc-1', displayName: 'Alice' },
        gadgets: [
          {
            id: 10001,
            moduleKey: 'com.atlassian.plugins.gadgets.AssignedToMeGadget',
            title: 'Assigned to Me',
            color: 'blue',
          },
        ],
      })

      const res = await handleGetDashboard({ dashboardId: '10100' })
      expect(res.text).toContain('Dashboard [10100]: Team Overview [Public]')
      expect(res.text).toContain('Owner: Alice (acc-1)')
      expect(res.text).toContain('Description: High level overview')
      expect(res.text).toContain('Gadgets (1)')
      expect(res.text).toContain('[ID: 10001] "Assigned to Me"')
    })

    it('shows "None" when dashboard has no gadgets', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: '10101',
        name: 'Empty',
        view: '/dashboards/10101',
        gadgets: [],
      })

      const res = await handleGetDashboard({ dashboardId: '10101' })
      expect(res.text).toContain('Gadgets: None')
    })
  })
})
