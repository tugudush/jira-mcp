import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleListProjects,
  handleGetProject,
  handleGetProjectComponents,
  handleGetProjectVersions,
  handleGetProjectStatuses,
} from '../../src/handlers/project.js'
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

describe('project handlers unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
  })

  describe('handleListProjects', () => {
    it('returns formatted list of projects', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        total: 2,
        values: [
          {
            key: 'PROJA',
            name: 'Alpha Project',
            projectTypeKey: 'software',
            lead: { displayName: 'Alice Owner' },
          },
          {
            key: 'PROJB',
            name: 'Beta Project',
            projectTypeKey: 'business',
            lead: { displayName: 'Bob Lead' },
          },
        ],
      })

      const res = await handleListProjects({})
      expect(res.data).toBeDefined()
      expect(res.text).toContain('Projects (showing 2 of 2)')
      expect(res.text).toContain(
        '- [PROJA] Alpha Project (Type: software, Lead: Alice Owner)'
      )
      expect(res.text).toContain(
        '- [PROJB] Beta Project (Type: business, Lead: Bob Lead)'
      )
    })

    it('handles zero projects gracefully', async () => {
      mockMakeRequest.mockResolvedValueOnce({ total: 0, values: [] })
      const res = await handleListProjects({})
      expect(res.text).toContain('No projects found.')
    })
  })

  describe('handleGetProject', () => {
    it('returns formatted details of a project', async () => {
      mockMakeRequest.mockResolvedValueOnce({
        key: 'PROJ',
        name: 'My Awesome Project',
        description: 'A super awesome project description.',
        projectTypeKey: 'software',
        style: 'next-gen',
        lead: { displayName: 'Jerome' },
      })

      const res = await handleGetProject({ projectIdOrKey: 'PROJ' })
      expect(res.text).toContain('Project [PROJ]: My Awesome Project')
      expect(res.text).toContain('- Style: next-gen')
      expect(res.text).toContain('- Type: software')
      expect(res.text).toContain('- Lead: Jerome')
      expect(res.text).toContain(
        '- Description: A super awesome project description.'
      )
    })
  })

  describe('handleGetProjectComponents', () => {
    it('lists components', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: '101',
          name: 'Backend',
          description: 'Node services',
          lead: { displayName: 'Jerome' },
        },
        { id: '102', name: 'Frontend', description: 'Vite app' },
      ])

      const res = await handleGetProjectComponents({ projectIdOrKey: 'PROJ' })
      expect(res.text).toContain('Components in Project PROJ (Total: 2)')
      expect(res.text).toContain(
        '- "Backend" (ID: 101 | Lead: Jerome) - Node services'
      )
      expect(res.text).toContain('- "Frontend" (ID: 102) - Vite app')
    })
  })

  describe('handleGetProjectVersions', () => {
    it('lists versions and releases', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          id: '1',
          name: 'v1.0.0',
          released: true,
          releaseDate: '2026-06-25',
          description: 'Gold release',
        },
        { id: '2', name: 'v1.1.0', released: false, archived: false },
      ])

      const res = await handleGetProjectVersions({ projectIdOrKey: 'PROJ' })
      expect(res.text).toContain('Versions in Project PROJ (Total: 2)')
      expect(res.text).toContain(
        '- "v1.0.0" (Status: Released | Release Date: 2026-06-25) - Gold release'
      )
      expect(res.text).toContain('- "v1.1.0" (Status: Unreleased)')
    })
  })

  describe('handleGetProjectStatuses', () => {
    it('returns status mappings per issue type', async () => {
      mockMakeRequest.mockResolvedValueOnce([
        {
          name: 'Bug',
          statuses: [
            { id: '1', name: 'To Do', statusCategory: { name: 'To Do' } },
            {
              id: '2',
              name: 'In Progress',
              statusCategory: { name: 'In Progress' },
            },
          ],
        },
        {
          name: 'Epic',
          statuses: [
            { id: '3', name: 'Backlog', statusCategory: { name: 'To Do' } },
          ],
        },
      ])

      const res = await handleGetProjectStatuses({ projectIdOrKey: 'PROJ' })
      expect(res.text).toContain('Issue Type Status Mappings for Project PROJ:')
      expect(res.text).toContain(
        '- **Bug**:\n  Statuses: To Do (1) [Category: To Do], In Progress (2) [Category: In Progress]'
      )
      expect(res.text).toContain(
        '- **Epic**:\n  Statuses: Backlog (3) [Category: To Do]'
      )
    })
  })
})
