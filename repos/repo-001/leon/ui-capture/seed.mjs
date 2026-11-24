// Seeds the isolated "just-me" profile with months of realistic Leon usage.
//
// Data goes in through Leon's own paths:
// - conversations are written in Leon's legacy archive format
//   (sessions/index.json + sessions/<id>/conversation_log.json), which Leon's
//   own `initializeConversationArchive` imports into conversations.sqlite;
// - workspaces are inserted into the `workspaces` table created by Leon's own
//   `initializeWorkspaces`, with the same payload WorkspaceRepository.create writes.
//
// Usage: node .ui-capture/seed.mjs   (wipes and recreates the profile's sessions)
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

import { SESSIONS, WORKSPACES } from './seed-data.mjs'

const CAPTURE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.dirname(CAPTURE)
const require = createRequire(path.join(ROOT, 'package.json'))
const SQLite = require('better-sqlite3')
const { initializeConversationArchive, CONVERSATION_DATABASE_FILENAME } = await import(
  pathToFileURL(path.join(ROOT, 'scripts/setup/migrations/2026103008000293-add-conversation-archive.js')).href
)
const { initializeWorkspaces } = await import(
  pathToFileURL(path.join(ROOT, 'scripts/setup/migrations/2026111512294097-add-workspaces.js')).href
)

const LEON_HOME = process.env.LEON_HOME || path.join(CAPTURE, 'leon-home')
const PROFILE = process.env.LEON_PROFILE || 'just-me'
const SESSIONS_PATH = path.join(LEON_HOME, 'profiles', PROFILE, 'sessions')
const MODEL = 'anthropic/claude-sonnet-5.5'
const DAY = 86_400_000
const MINUTE = 60_000
// Anchor "now" to the real clock so relative dates (Today, Yesterday) stay meaningful.
const NOW = Date.now()

// Deterministic UUIDs keep re-seeding stable.
function uuid(...parts) {
  const hex = createHash('sha256').update(parts.join('|')).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + (parseInt(hex[16], 16) % 4)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function rand(seed) {
  return parseInt(createHash('md5').update(String(seed)).digest('hex').slice(0, 8), 16) / 0xffffffff
}

const TOOL_META = {
  'weather.openmeteo.getWeather': { toolkitName: 'Weather', toolName: 'Open-Meteo', toolkitIconName: 'sun-cloudy-line' },
  'search_web.hosted.searchWeb': { toolkitName: 'Search web', toolName: 'Hosted LLM Web', toolIconName: 'global-line' },
  'search_web.crawlberg.fetchUrl': { toolkitName: 'Search web', toolName: 'Crawlberg', toolIconName: 'eye-line' },
  'file_system.file.read': { toolkitName: 'File system', toolName: 'File', toolIconName: 'file-text-line' },
  'file_system.file.patch': { toolkitName: 'File system', toolName: 'File', toolIconName: 'file-text-line' },
  'file_system.ripgrep.search': { toolkitName: 'File system', toolName: 'Ripgrep', toolIconName: 'file-search-line' },
  'file_system.zvec_grep.search': { toolkitName: 'File system', toolName: 'Workspace search', toolIconName: 'file-search-line' },
  'operating_system_control.shell.executeCommand': { toolkitName: 'Operating system control', toolName: 'Shell', toolIconName: 'terminal-line' }
}

function buildTrace(turnId, turn, startedAt, answer) {
  const tools = (turn.tools || []).map((tool, index) => {
    const at = startedAt + 900 + index * 2_400
    const output = tool.error
      ? { result: { success: false, error: tool.error } }
      : { result: { success: true, data: tool.output } }

    return {
      id: `call_${uuid(turnId, 'tool', index).replace(/-/g, '').slice(0, 24)}`,
      name: tool.name,
      toolCallTitle: tool.title,
      ...TOOL_META[tool.name],
      status: tool.error ? 'error' : 'success',
      preparationStartedAt: at - 120,
      startedAt: at,
      durationMs: tool.ms ?? Math.round(300 + rand(`${turnId}${index}`) * 2_200),
      input: tool.input,
      output,
      ...(tool.commandOutput ? { commandOutput: tool.commandOutput } : {}),
      ...(tool.error ? { errorMessage: tool.error } : {}),
      ...(tool.planStep ? { planStepId: `${turnId}:step:${tool.planStep}` } : {})
    }
  })
  const planSteps = (turn.plan || []).map((label, index) => ({
    id: `${turnId}:step:${index + 1}`, label, status: 'completed'
  }))
  const outputTokens = Math.max(40, Math.round(answer.length / 3.6))
  const inputTokens = 4_200 + Math.round(rand(turnId) * 9_000) + tools.length * 1_800
  const durationMs = (turn.workMs ?? (1_400 + tools.length * 2_600 + outputTokens * 9))
  const costUSD = Number(((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(4))

  return {
    id: turnId,
    answerStartedAt: startedAt + durationMs - outputTokens * 6,
    planSteps,
    toolCalls: tools,
    ...(turn.reasoning ? {
      reasoning: [{ id: `${turnId}:reasoning`, text: turn.reasoning, phase: 'agent', startedAt: startedAt + 200 }],
      reasoningSummary: turn.reasoning.split('. ')[0]
    } : {}),
    metrics: {
      completionCount: 1 + tools.length,
      contextUsedTokens: inputTokens,
      contextUsageEstimated: false,
      contextWindowTokens: 1_000_000,
      contextUsagePercent: Number((inputTokens / 10_000).toFixed(2)),
      usageAccounting: {
        cachedInputTokens: Math.round(inputTokens * 0.6), cacheReadCompletionCount: tools.length,
        cacheWriteInputTokens: 0, costUSD, costCompletionCount: 1 + tools.length,
        estimatedCostCompletionCount: 0, costSources: ['provider-reported']
      },
      inputTokens, outputTokens, totalTokens: inputTokens + outputTokens,
      durationMs,
      turnInputTokens: inputTokens, turnOutputTokens: outputTokens, turnTotalTokens: inputTokens + outputTokens,
      ttftMs: 600 + Math.round(rand(`${turnId}ttft`) * 900),
      tokensPerSecond: 70 + Math.round(rand(`${turnId}tps`) * 60),
      total_duration_ms: durationMs
    }
  }
}

function buildSession(spec, index) {
  const id = uuid('session', spec.title)
  // Spread the starting time over the chosen day at a plausible hour.
  const dayStart = new Date(NOW - spec.daysAgo * DAY)
  dayStart.setHours(spec.hour ?? Math.floor(8 + rand(spec.title) * 13), Math.floor(rand(`${spec.title}m`) * 60), 0, 0)
  let clock = Math.min(dayStart.getTime(), NOW - 20 * MINUTE)
  const sessionCreatedAt = clock

  const records = []
  spec.turns.forEach((turn, turnIndex) => {
    if (turn.gapMinutes) {
      clock += turn.gapMinutes * MINUTE
    }
    const ownerId = uuid(id, 'owner', turnIndex)
    records.push({ who: 'owner', message: turn.q, messageId: ownerId, isAddedToHistory: true, sentAt: clock })
    const answer = turn.a
    const trace = buildTrace(ownerId, turn, clock, answer)
    clock += trace.metrics.durationMs
    records.push({
      who: 'leon',
      message: answer,
      messageId: `${ownerId}:leon`,
      isAddedToHistory: true,
      sentAt: clock,
      inference: {
        provider: 'openrouter', model: spec.model || MODEL, authMode: 'api_key',
        credentialSource: 'profile_api_key', endpoint: 'https://openrouter.ai/api/v1/chat/completions'
      },
      agentResponseTrace: trace
    })
    clock += (2 + Math.round(rand(`${id}${turnIndex}`) * 6)) * MINUTE
  })

  const lastMessageAt = records.length ? records.at(-1).sentAt : null
  const session = {
    id,
    ...(spec.workspace ? { workspaceId: uuid('workspace', spec.workspace) } : {}),
    title: spec.title,
    isTitleGenerated: spec.generatedTitle !== false,
    isPinned: Boolean(spec.pinned),
    createdAt: sessionCreatedAt,
    updatedAt: lastMessageAt ?? sessionCreatedAt,
    lastMessageAt,
    messageCount: records.length,
    modelTarget: spec.model ? `openrouter/${spec.model}` : null
  }

  return { session, records, index }
}

function main() {
  fs.rmSync(SESSIONS_PATH, { recursive: true, force: true })
  fs.mkdirSync(SESSIONS_PATH, { recursive: true })

  const built = SESSIONS.map(buildSession)
  const ordered = [...built].sort((a, b) => (b.session.lastMessageAt ?? 0) - (a.session.lastMessageAt ?? 0))
  for (const { session, records } of built) {
    const directory = path.join(SESSIONS_PATH, session.id)
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, 'conversation_log.json'), JSON.stringify(records, null, 2))
  }
  fs.writeFileSync(path.join(SESSIONS_PATH, 'index.json'), JSON.stringify({
    activeSessionId: ordered[0].session.id,
    sessions: ordered.map((entry) => entry.session)
  }, null, 2))

  const db = new SQLite(path.join(SESSIONS_PATH, CONVERSATION_DATABASE_FILENAME))
  try {
    // Leon's own import of the legacy archive, then its workspace schema.
    initializeConversationArchive(db, SESSIONS_PATH)
    initializeWorkspaces(db)
    const insert = db.prepare('INSERT INTO workspaces(id, payload) VALUES (?, ?)')
    for (const workspace of WORKSPACES) {
      const createdAt = NOW - workspace.daysAgo * DAY
      const payload = {
        name: workspace.name, brief: workspace.brief, resources: workspace.resources,
        color: workspace.color ?? 'default', ...(workspace.pinned ? { isPinned: true } : {}),
        id: uuid('workspace', workspace.name), createdAt, updatedAt: createdAt + DAY * 2
      }
      insert.run(payload.id, JSON.stringify(payload))
    }
    const counts = db.prepare(`SELECT
      (SELECT count(*) FROM conversation_sessions) AS sessions,
      (SELECT count(*) FROM conversation_messages) AS messages,
      (SELECT count(*) FROM workspaces) AS workspaces`).get()
    console.log(`Seeded ${counts.sessions} sessions, ${counts.messages} messages, ${counts.workspaces} workspaces into ${SESSIONS_PATH}`)
  } finally {
    db.close()
  }
}

main()
