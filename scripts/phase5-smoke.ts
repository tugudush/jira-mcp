#!/usr/bin/env tsx
/**
 * Phase 5 end-to-end smoke test: drives the *built* jira-mcp server
 * (dist/index.js) over stdio using the MCP JSON-RPC protocol and calls:
 *   1. jira_get_current_user     — confirm authenticated identity
 *   2. jira_get_issue (KAN-1)    — capture pre-update title/description
 *   3. jira_update_issue_text    — actual update (title + description)
 *   4. jira_get_issue (KAN-1)    — confirm post-update state
 *
 * Run with: npx tsx scripts/phase5-smoke.ts
 *           (or: npm run phase5:smoke)
 *
 * Env vars required (mirror .vscode/mcp.json):
 *   JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_ALLOW_ISSUE_UPDATES=true
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const serverEntry = resolve(__dirname, '..', 'dist', 'index.js')

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface IssueShape {
  fields?: { summary?: string; description?: { content?: unknown[] } }
}

class McpStdioClient {
  private proc: ChildProcessWithoutNullStreams
  private buffer = ''
  private nextId = 1
  private pending = new Map<
    number,
    { resolve: (v: JsonRpcResponse) => void; reject: (e: Error) => void }
  >()

  constructor(entry: string, env: NodeJS.ProcessEnv) {
    this.proc = spawn('node', [entry], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc.stdout.on('data', (chunk: Buffer) => this.onData(chunk))
    this.proc.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(`[server stderr] ${chunk.toString()}`)
    })
    this.proc.on('exit', (code) => {
      const err = new Error(`server exited prematurely (code=${code})`)
      for (const { reject } of this.pending.values()) reject(err)
      this.pending.clear()
    })
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString('utf8')
    let idx = this.buffer.indexOf('\n')
    while (idx !== -1) {
      const line = this.buffer.slice(0, idx).trim()
      this.buffer = this.buffer.slice(idx + 1)
      if (line.length > 0) {
        try {
          const msg = JSON.parse(line) as JsonRpcResponse
          const id = msg.id
          if (typeof id === 'number' && this.pending.has(id)) {
            const handler = this.pending.get(id)!
            this.pending.delete(id)
            handler.resolve(msg)
          }
        } catch {
          process.stderr.write(`[client] could not parse line: ${line}\n`)
        }
      }
      idx = this.buffer.indexOf('\n')
    }
  }

  private send(method: string, params: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params })
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.proc.stdin.write(payload + '\n', (err) => {
        if (err) reject(err)
      })
    })
  }

  async initialize(): Promise<void> {
    const res = await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'phase5-smoke', version: '0.0.1' },
    })
    if (res.error) throw new Error(`initialize failed: ${res.error.message}`)
    this.proc.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) +
        '\n'
    )
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const res = await this.send('tools/call', { name, arguments: args })
    if (res.error) {
      throw new Error(`tool ${name} failed: ${res.error.message}`)
    }
    return res.result
  }

  async close(): Promise<void> {
    this.proc.stdin.end()
    await new Promise<void>((resolve) => this.proc.on('exit', () => resolve()))
  }
}

function extractText(result: unknown): string {
  const r = result as { content?: Array<{ type: string; text: string }> }
  if (!r?.content) return ''
  return r.content.map((c) => c.text ?? '').join('\n')
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`missing env var: ${key}`)
  return value
}

function envOr(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

function logSection(title: string, body: string, max = 1500): void {
  console.log(title)
  console.log(body.slice(0, max))
}

function assertTitleChanged(
  before: IssueShape,
  after: IssueShape,
  expectedTitle: string
): boolean {
  const beforeTitle = before.fields?.summary
  const afterTitle = after.fields?.summary
  if (afterTitle === expectedTitle) {
    console.log(`\n✅ title changed: "${beforeTitle}" → "${afterTitle}"`)
    return true
  }
  console.log(
    `\n❌ title did NOT match expected.\n  before: ${beforeTitle}\n  after:  ${afterTitle}\n  expect: ${expectedTitle}`
  )
  return false
}

function assertDescriptionPresent(after: IssueShape): boolean {
  const nodes = after.fields?.description?.content ?? null
  if (nodes !== null) {
    console.log(
      `✅ description present after update (${nodes.length} ADF nodes)`
    )
    return true
  }
  console.log(`❌ description missing or null after update`)
  return false
}

async function readCurrentUser(client: McpStdioClient): Promise<void> {
  const text = extractText(
    await client.callTool('jira_get_current_user', { output_format: 'json' })
  )
  logSection('--- 1) jira_get_current_user ---', text, 800)
}

async function readIssue(
  client: McpStdioClient,
  issueKey: string
): Promise<IssueShape> {
  const text = extractText(
    await client.callTool('jira_get_issue', {
      issueIdOrKey: issueKey,
      output_format: 'json',
    })
  )
  return JSON.parse(text) as IssueShape
}

async function updateIssue(
  client: McpStdioClient,
  issueKey: string,
  title: string,
  description: string
): Promise<void> {
  const text = extractText(
    await client.callTool('jira_update_issue_text', {
      issueIdOrKey: issueKey,
      title,
      description,
      output_format: 'json',
    })
  )
  logSection('\n--- 3) jira_update_issue_text ---', text, 5000)
}

async function runRoundTrip(
  client: McpStdioClient,
  issueKey: string,
  newTitle: string,
  newDescription: string
): Promise<boolean> {
  await readCurrentUser(client)

  const before = await readIssue(client, issueKey)
  logSection(
    '\n--- 2) jira_get_issue (BEFORE update) ---',
    JSON.stringify(before),
    1500
  )

  await updateIssue(client, issueKey, newTitle, newDescription)

  const after = await readIssue(client, issueKey)
  logSection(
    '\n--- 4) jira_get_issue (AFTER update) ---',
    JSON.stringify(after),
    1500
  )

  const titleOk = assertTitleChanged(before, after, newTitle)
  const descOk = assertDescriptionPresent(after)
  return titleOk && descOk
}

function validateEnv(): void {
  for (const k of [
    'JIRA_BASE_URL',
    'JIRA_EMAIL',
    'JIRA_API_TOKEN',
    'JIRA_ALLOW_ISSUE_UPDATES',
  ]) {
    requireEnv(k)
  }
}

async function main(): Promise<void> {
  validateEnv()

  const issueKey = envOr('PHASE5_ISSUE_KEY', 'KAN-1')
  const newTitle = envOr(
    'PHASE5_NEW_TITLE',
    'Phase 5 smoke title from jira-mcp'
  )
  const newDescription = envOr(
    'PHASE5_NEW_DESCRIPTION',
    'Phase 5 smoke description from jira-mcp. Updated via PUT /rest/api/3/issue/{key}.'
  )

  console.log(`▶ using server entry: ${serverEntry}`)
  console.log(`▶ issue:               ${issueKey}`)
  console.log(`▶ new title:           ${newTitle}`)
  console.log('')

  const client = new McpStdioClient(serverEntry, {
    ...process.env,
    JIRA_DEBUG: envOr('JIRA_DEBUG', 'true'),
  })

  try {
    await client.initialize()
    const ok = await runRoundTrip(client, issueKey, newTitle, newDescription)
    if (!ok) process.exitCode = 1
  } finally {
    await client.close()
  }
}

main().catch((err: unknown) => {
  console.error('smoke test failed:', err)
  process.exitCode = 1
})
