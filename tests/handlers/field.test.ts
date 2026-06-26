import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListFields,
  handleListIssueTypes,
  handleGetCreateMeta,
} from '../../src/handlers/field.js'
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

describe('field and issuetype handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListFields', () => {
    it('lists custom and system fields successfully', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: 'summary',
          name: 'Summary',
          custom: false,
          schema: { type: 'string' },
        },
        {
          id: 'customfield_10001',
          name: 'Sprint Points',
          custom: true,
          schema: { type: 'number' },
        },
      ])

      const res = await handleListFields()
      expect(res.text).toContain('Jira Fields (count: 2)')
      expect(res.text).toContain(
        '- [ID: summary] "Summary" (Type: string, Custom: false)'
      )
      expect(res.text).toContain(
        '- [ID: customfield_10001] "Sprint Points" (Type: number, Custom: true)'
      )
    })

    it('returns empty message if no fields found', async () => {
      mockMakeRequest.mockResolvedValueOnce([])
      const res = await handleListFields()
      expect(res.text).toContain('No fields found.')
    })
  })

  describe('handleListIssueTypes', () => {
    it('lists issue types successfully', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: '10001',
          name: 'Bug',
          description: 'A problem / issue.',
          subtask: false,
        },
      ])

      const res = await handleListIssueTypes()
      expect(res.text).toContain('Jira Issue Types (count: 1)')
      expect(res.text).toContain(
        '- [ID: 10001] "Bug" (Subtask: false) - A problem / issue.'
      )
    })
  })

  describe('handleGetCreateMeta', () => {
    it('returns confirmation of metadata retrieval', async () => {
      mockMakeRequest.mockResolvedValueOnce({ projects: [] })

      const res = await handleGetCreateMeta({ projectKeys: ['PROJ'] })
      expect(res.text).toContain(
        'Issue Create Metadata retrieved successfully.'
      )
      expect(res.data).toBeDefined()
    })
  })
})
