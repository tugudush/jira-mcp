import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/generated/version.js'

describe('jira-mcp smoke', () => {
  it('exports a VERSION string', () => {
    expect(typeof VERSION).toBe('string')
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
