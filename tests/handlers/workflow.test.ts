import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListStatuses,
  handleListWorkflows,
} from '../../src/handlers/workflow.js'
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

describe('workflow handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListStatuses', () => {
    it('lists all workflow statuses with category info', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: '10000',
          name: 'To Do',
          description: 'Work that needs to be done',
          statusCategory: {
            id: 1,
            key: 'new',
            name: 'To Do',
            colorName: 'blue-gray',
          },
        },
        {
          id: '3',
          name: 'In Progress',
          statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' },
        },
        {
          id: '10001',
          name: 'Done',
          statusCategory: {
            id: 3,
            key: 'done',
            name: 'Done',
            colorName: 'green',
          },
        },
      ])

      const res = await handleListStatuses()
      expect(res.text).toContain('Jira Statuses (count: 3)')
      expect(res.text).toContain(
        '- [ID: 10000] "To Do" (Category: To Do) - Work that needs to be done'
      )
      expect(res.text).toContain(
        '- [ID: 3] "In Progress" (Category: In Progress)'
      )
      expect(res.text).toContain('- [ID: 10001] "Done" (Category: Done)')
    })

    it('returns empty state when no statuses', async () => {
      mockMakeRequest.mockResolvedValueOnce([])
      const res = await handleListStatuses()
      expect(res.text).toContain('No statuses found.')
    })
  })

  describe('handleListWorkflows', () => {
    it('lists workflows with default badge and description', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
        values: [
          {
            id: 'wf-1',
            name: 'Classic Software Development Workflow',
            description: 'Default Jira workflow',
            isDefault: true,
          },
          {
            id: 'wf-2',
            name: 'Simplified Issue Tracking Workflow',
            isDefault: false,
          },
        ],
      })

      const res = await handleListWorkflows({})
      expect(res.text).toContain('Jira Workflows (showing 2 of 2)')
      expect(res.text).toContain(
        '- [ID: wf-1] "Classic Software Development Workflow" [Default]'
      )
      expect(res.text).toContain('Description: Default Jira workflow')
      expect(res.text).toContain(
        '- [ID: wf-2] "Simplified Issue Tracking Workflow"'
      )
    })

    it('returns empty state when no workflows', async () => {
      mockMakeRequest.mockResolvedValueOnce({ total: 0, values: [] })
      const res = await handleListWorkflows({})
      expect(res.text).toContain('No workflows found.')
    })
  })
})
