import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig, resetConfig } from '../src/config.js'

describe('config.ts unit tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear relevant env vars
    delete process.env.JIRA_BASE_URL
    delete process.env.JIRA_EMAIL
    delete process.env.JIRA_API_TOKEN
    delete process.env.JIRA_ALLOW_ISSUE_UPDATES
    delete process.env.JIRA_DEBUG
    delete process.env.JIRA_DEFAULT_FORMAT
    delete process.env.JIRA_REQUEST_TIMEOUT_MS

    resetConfig()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    resetConfig()
  })

  it('fails validation if JIRA_BASE_URL is missing', () => {
    process.env.JIRA_EMAIL = 'test@example.com'
    process.env.JIRA_API_TOKEN = 'apitoken'

    expect(() => loadConfig()).toThrow('Configuration validation failed')
  })

  it('fails validation if JIRA_EMAIL is not a valid email', () => {
    process.env.JIRA_BASE_URL = 'https://my-jira.atlassian.net'
    process.env.JIRA_EMAIL = 'invalidemail'
    process.env.JIRA_API_TOKEN = 'apitoken'

    expect(() => loadConfig()).toThrow('Configuration validation failed')
  })

  it('loads and parses correctly with valid inputs', () => {
    process.env.JIRA_BASE_URL = 'https://my-jira.atlassian.net/'
    process.env.JIRA_EMAIL = 'test@example.com'
    process.env.JIRA_API_TOKEN = 'apitoken'
    process.env.JIRA_ALLOW_ISSUE_UPDATES = 'true'
    process.env.JIRA_DEBUG = 'true'
    process.env.JIRA_DEFAULT_FORMAT = 'toon'
    process.env.JIRA_REQUEST_TIMEOUT_MS = '15000'

    const cfg = loadConfig()

    // Trailing slash should be stripped
    expect(cfg.JIRA_BASE_URL).toBe('https://my-jira.atlassian.net')
    expect(cfg.JIRA_EMAIL).toBe('test@example.com')
    expect(cfg.JIRA_API_TOKEN).toBe('apitoken')
    expect(cfg.JIRA_ALLOW_ISSUE_UPDATES).toBe(true)
    expect(cfg.JIRA_DEBUG).toBe(true)
    expect(cfg.JIRA_DEFAULT_FORMAT).toBe('toon')
    expect(cfg.JIRA_REQUEST_TIMEOUT_MS).toBe(15000)
  })

  it('assigns proper defaults for optional fields', () => {
    process.env.JIRA_BASE_URL = 'https://my-jira.atlassian.net'
    process.env.JIRA_EMAIL = 'test@example.com'
    process.env.JIRA_API_TOKEN = 'apitoken'

    const cfg = loadConfig()

    expect(cfg.JIRA_ALLOW_ISSUE_UPDATES).toBe(false)
    expect(cfg.JIRA_DEBUG).toBe(false)
    expect(cfg.JIRA_DEFAULT_FORMAT).toBe('text')
    expect(cfg.JIRA_REQUEST_TIMEOUT_MS).toBe(30000)
  })
})
