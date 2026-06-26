import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListBoards,
  handleGetBoard,
  handleGetBoardIssues,
  handleGetBoardSprints,
  handleGetSprint,
  handleGetSprintIssues,
  handleGetBacklogIssues,
} from '../../src/handlers/agile.js'
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

describe('agile handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListBoards', () => {
    it('lists agile boards successfully', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 2,
        values: [
          {
            id: 1,
            name: 'Board Scrum',
            type: 'scrum',
            location: { projectKey: 'PROJ' },
          },
          {
            id: 2,
            name: 'Board Kanban',
            type: 'kanban',
          },
        ],
      })

      const res = await handleListBoards({})
      expect(res.text).toContain('Agile Boards (showing 2 of 2)')
      expect(res.text).toContain(
        '- [ID: 1] "Board Scrum" (Type: scrum | Project: PROJ)'
      )
      expect(res.text).toContain('- [ID: 2] "Board Kanban" (Type: kanban)')
    })

    it('returns empty message if no boards', async () => {
      mockMakeRequest.mockResolvedValueOnce({ values: [] })
      const res = await handleListBoards({})
      expect(res.text).toContain('No boards found.')
    })
  })

  describe('handleGetBoard', () => {
    it('returns board detail', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: 10,
        name: 'Sprint Board',
        type: 'scrum',
        location: { projectName: 'My Project', projectKey: 'MYPROJ' },
      })

      const res = await handleGetBoard({ boardId: 10 })
      expect(res.text).toContain('Board [10]: Sprint Board')
      expect(res.text).toContain('- Type: scrum')
      expect(res.text).toContain('- Project: My Project (MYPROJ)')
    })
  })

  describe('handleGetBoardIssues', () => {
    it('returns board issues list', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 5,
        issues: [
          {
            key: 'PROJ-1',
            fields: {
              summary: 'Issue 1',
              status: { name: 'To Do' },
              assignee: { displayName: 'Alice' },
              priority: { name: 'High' },
            },
          },
        ],
      })

      const res = await handleGetBoardIssues({ boardId: 1 })
      expect(res.text).toContain('Issues for Board 1 (showing 1 of 5)')
      expect(res.text).toContain(
        '- [PROJ-1] Issue 1\n  Status: To Do | Assignee: Alice | Priority: High'
      )
    })
  })

  describe('handleGetBoardSprints', () => {
    it('returns Board sprints', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 10,
        values: [
          {
            id: 101,
            name: 'Sprint 1',
            state: 'active',
            startDate: '2026-06-01',
            endDate: '2026-06-15',
            goal: 'Ship it!',
          },
        ],
      })

      const res = await handleGetBoardSprints({ boardId: 5 })
      expect(res.text).toContain('Sprints for Board 5 (showing 1 of 10)')
      expect(res.text).toContain(
        '- [ID: 101] "Sprint 1" (State: active [2026-06-01 - 2026-06-15] | Goal: Ship it!)'
      )
    })
  })

  describe('handleGetSprint', () => {
    it('returns detailed sprint info', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        id: 123,
        name: 'Super Sprint',
        state: 'future',
        goal: 'Win',
      })

      const res = await handleGetSprint({ sprintId: 123 })
      expect(res.text).toContain('Sprint [123]: Super Sprint')
      expect(res.text).toContain('- State: future')
      expect(res.text).toContain('- Goal: Win')
    })
  })

  describe('handleGetSprintIssues', () => {
    it('returns sprint issues list', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 1,
        issues: [
          {
            key: 'PROJ-2',
            fields: {
              summary: 'Sprint Issue 2',
              status: { name: 'In Progress' },
              assignee: null,
              priority: null,
            },
          },
        ],
      })

      const res = await handleGetSprintIssues({ sprintId: 44 })
      expect(res.text).toContain('Issues for Sprint 44 (showing 1 of 1)')
      expect(res.text).toContain(
        '- [PROJ-2] Sprint Issue 2\n  Status: In Progress | Assignee: Unassigned | Priority: None'
      )
    })
  })

  describe('handleGetBacklogIssues', () => {
    it('returns backlog issues', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 1,
        issues: [
          {
            key: 'PROJ-3',
            fields: {
              summary: 'Backlog item',
              status: { name: 'To Do' },
            },
          },
        ],
      })

      const res = await handleGetBacklogIssues({ boardId: 2 })
      expect(res.text).toContain('Backlog Issues for Board 2 (showing 1 of 1)')
      expect(res.text).toContain('- [PROJ-3] Backlog item')
    })
  })
})
