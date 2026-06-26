import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleSearchIssues,
  handleSearchJql,
  handleGetIssue,
  handleGetIssueTransitions,
  handleGetIssueChangelog,
  handleGetIssueComments,
  handleGetIssueWorklogs,
  convertAdfToText,
} from '../../src/handlers/issue.js'
import * as api from '../../src/api.js'

// Mock the API module
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

describe('issue handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('convertAdfToText helper', () => {
    it('converts simple string', () => {
      expect(convertAdfToText('hello')).toBe('hello')
    })

    it('converts ADF doc schema recursively', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Line 1' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Line 2' }],
          },
        ],
      }
      // paragraph adds a newline
      expect(convertAdfToText(adf)).toBe('Line 1\nLine 2\n')
    })
  })

  describe('handleSearchIssues', () => {
    it('returns formatted results', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        isLast: true,
        issues: [
          {
            key: 'PROJ-1',
            fields: {
              summary: 'Fix bug 1',
              status: { name: 'In Progress' },
              assignee: { displayName: 'Jerome' },
              priority: { name: 'High' },
            },
          },
          {
            key: 'PROJ-2',
            fields: {
              summary: 'Write docs 2',
              status: { name: 'To Do' },
              assignee: null,
              priority: null,
            },
          },
        ],
      })

      const res = await handleSearchIssues({ jql: 'project = PROJ' })
      expect(res.data).toBeDefined()
      expect(res.text).toContain('[PROJ-1] Fix bug 1')
      expect(res.text).toContain(
        'Status: In Progress | Assignee: Jerome | Priority: High'
      )
      expect(res.text).toContain('[PROJ-2] Write docs 2')
      expect(res.text).toContain(
        'Status: To Do | Assignee: Unassigned | Priority: None'
      )
    })

    it('returns elegant notice for empty lists', async () => {
      mockMakeRequest.mockResolvedValueOnce({ isLast: true, issues: [] })
      const res = await handleSearchIssues({})
      expect(res.text).toContain('No issues found matching query.')
    })
  })

  describe('handleSearchJql (GET variant)', () => {
    it('returns formatted items', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        isLast: true,
        issues: [
          {
            key: 'PROJ-3',
            fields: {
              summary: 'GET search test',
              status: { name: 'Done' },
              assignee: { displayName: 'Admin' },
            },
          },
        ],
      })

      const res = await handleSearchJql({ jql: 'id = PROJ-3' })
      expect(res.text).toContain(
        'Search Issues Results (GET, count: 1, isLast: true)'
      )
      expect(res.text).toContain(
        '[PROJ-3] GET search test (Status: Done, Assignee: Admin)'
      )
    })
  })

  describe('handleGetIssue', () => {
    it('returns structured details', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        key: 'PROJ-123',
        fields: {
          summary: 'Database refactoring',
          status: { name: 'In Progress' },
          issuetype: { name: 'Task' },
          priority: { name: 'Medium' },
          assignee: { displayName: 'Jerome Gomez' },
          reporter: { displayName: 'Manager' },
          created: '2026-06-01T12:00:00Z',
          updated: '2026-06-15T12:00:00Z',
          description: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Refactor DB.' }],
              },
            ],
          },
        },
      })

      const res = await handleGetIssue({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain('Issue [PROJ-123]: Database refactoring')
      expect(res.text).toContain('- Type: Task')
      expect(res.text).toContain('- Assignee: Jerome Gomez')
      expect(res.text).toContain('- Description:\nRefactor DB.')
    })
  })

  describe('handleGetIssueTransitions', () => {
    it('returns allowed transitions list', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        transitions: [
          { id: '11', name: 'In Progress', to: { name: 'In Progress' } },
          { id: '21', name: 'Resolve Issue', to: { name: 'Done' } },
        ],
      })

      const res = await handleGetIssueTransitions({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain(
        'ID: 11 -> Name: "In Progress" (Status: In Progress)'
      )
      expect(res.text).toContain(
        'ID: 21 -> Name: "Resolve Issue" (Status: Done)'
      )
    })
  })

  describe('handleGetIssueChangelog', () => {
    it('returns changes timeline', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 1,
        values: [
          {
            author: { displayName: 'Jerome' },
            created: '2026-06-10T10:00:00Z',
            items: [
              { field: 'status', fromString: 'To Do', toString: 'In Progress' },
            ],
          },
        ],
      })

      const res = await handleGetIssueChangelog({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain('Changelog for issue PROJ-123')
      expect(res.text).toContain(
        '[2026-06-10T10:00:00Z] Jerome: "status" changed from "To Do" to "In Progress"'
      )
    })
  })

  describe('handleGetIssueComments', () => {
    it('returns comment threads', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 1,
        comments: [
          {
            author: { displayName: 'Tester' },
            created: '2026-06-12T09:00:00Z',
            body: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Nice work.' }],
                },
              ],
            },
          },
        ],
      })

      const res = await handleGetIssueComments({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain('Tester | Created: 2026-06-12T09:00:00Z')
      expect(res.text).toContain('Comment: Nice work.')
    })
  })

  describe('handleGetIssueWorklogs', () => {
    it('returns work logged list', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 1,
        worklogs: [
          {
            author: { displayName: 'Jerome' },
            timeSpent: '4h',
            started: '2026-06-20T08:00:00Z',
            comment: 'Working through the problems.',
          },
        ],
      })

      const res = await handleGetIssueWorklogs({ issueIdOrKey: 'PROJ-123' })
      expect(res.text).toContain(
        'Author: Jerome | Started: 2026-06-20T08:00:00Z | Time Spent: 4h'
      )
      expect(res.text).toContain('Comment: Working through the problems.')
    })
  })
})
