import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleUpdateIssueText } from '../../src/handlers/issue-update.js'
import { IssueUpdatePermissionError } from '../../src/errors.js'
import * as api from '../../src/api.js'

vi.mock('../../src/api.js', () => {
  return {
    buildApiUrl: (endpoint: string) =>
      `https://mock-jira.atlassian.net${endpoint}`,
    addQueryParams: (url: string, params: Record<string, unknown>) => {
      const q = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
      return q ? `${url}?${q}` : url
    },
    makeRequest: vi.fn(),
    makeIssueUpdateRequest: vi.fn(),
  }
})

describe('issue update handler unit tests', () => {
  const mockMakeRequest = vi.mocked(api.makeRequest)
  const mockMakeIssueUpdateRequest = vi.mocked(api.makeIssueUpdateRequest)

  beforeEach(() => {
    mockMakeRequest.mockReset()
    mockMakeIssueUpdateRequest.mockReset()
  })

  function getUpdateBody(): Record<string, unknown> {
    const requestOptions = mockMakeIssueUpdateRequest.mock.calls[0]?.[1]
    return JSON.parse(String(requestOptions?.body)) as Record<string, unknown>
  }

  it('updates title and description when current user is reporter', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        accountId: 'acc-current',
        displayName: 'Jerome',
      })
      .mockResolvedValueOnce({
        key: 'PROJ-123',
        fields: {
          summary: 'Old title',
          reporter: { accountId: 'acc-current', displayName: 'Jerome' },
          assignee: { accountId: 'acc-other', displayName: 'Alice' },
        },
      })
    mockMakeIssueUpdateRequest.mockResolvedValueOnce({})

    const result = await handleUpdateIssueText({
      issueIdOrKey: 'PROJ-123',
      title: 'New title',
      description: 'New description',
    })

    const updateBody = getUpdateBody()
    expect(result.text).toContain('Updated issue PROJ-123: title, description')
    expect(result.text).toContain('authenticated user is the reporter')
    expect(updateBody).toMatchObject({
      fields: {
        summary: 'New title',
        description: { type: 'doc', version: 1 },
      },
    })
    expect(JSON.stringify(updateBody)).toContain('New description')
  })

  it('updates title when current user is assignee', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        accountId: 'acc-current',
        displayName: 'Jerome',
      })
      .mockResolvedValueOnce({
        key: 'PROJ-234',
        fields: {
          reporter: { accountId: 'acc-other', displayName: 'Alice' },
          assignee: { accountId: 'acc-current', displayName: 'Jerome' },
        },
      })
    mockMakeIssueUpdateRequest.mockResolvedValueOnce({})

    const result = await handleUpdateIssueText({
      issueIdOrKey: 'PROJ-234',
      title: 'Assignee update',
    })

    const updateBody = getUpdateBody()
    expect(result.text).toContain('authenticated user is the assignee')
    expect(updateBody).toEqual({ fields: { summary: 'Assignee update' } })
  })

  it('denies update when current user is neither reporter nor assignee', async () => {
    mockMakeRequest
      .mockResolvedValueOnce({
        accountId: 'acc-current',
        displayName: 'Jerome',
      })
      .mockResolvedValueOnce({
        key: 'PROJ-345',
        fields: {
          reporter: { accountId: 'acc-reporter', displayName: 'Alice' },
          assignee: { accountId: 'acc-assignee', displayName: 'Bob' },
        },
      })

    await expect(
      handleUpdateIssueText({ issueIdOrKey: 'PROJ-345', title: 'Denied' })
    ).rejects.toThrow(IssueUpdatePermissionError)
    expect(mockMakeIssueUpdateRequest).not.toHaveBeenCalled()
  })

  it('requires at least one editable field', async () => {
    await expect(
      handleUpdateIssueText({ issueIdOrKey: 'PROJ-456' })
    ).rejects.toThrow('Provide title, description, or both.')
  })
})
