/**
 * TypeScript interfaces for Jira Cloud API responses.
 */

export interface JiraUser {
  self: string
  accountId: string
  emailAddress?: string
  avatarUrls?: Record<string, string>
  displayName: string
  active: boolean
  timeZone: string
  locale: string
}
