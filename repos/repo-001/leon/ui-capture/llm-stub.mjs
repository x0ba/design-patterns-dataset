// Local stand-in for OpenRouter's OpenAI-compatible API (chat completions).
// Leon's profile config points `llm.providers.openrouter.base_url` here, so the
// real server code path runs unchanged while no request leaves the machine.
import fs from 'node:fs'
import http from 'node:http'
import { randomUUID } from 'node:crypto'

// Loaded with `node --import` inside the Leon server process (see start.sh), so it
// shares the server lifecycle; it can also run standalone: node llm-stub.mjs [port]
const standalone = import.meta.url === `file://${process.argv[1]}`
const port = Number((standalone && process.argv[2]) || process.env.LLM_STUB_PORT || 4471)

const ANSWERS = [
  {
    match: /weather|rain|umbrella|forecast/i,
    text: 'Looking at today in Lyon: light rain until about 2 pm, then clearing with a high of 13 °C. I would take the compact umbrella for the morning and you can leave it at the office for the walk home — the evening looks dry and calm.'
  },
  {
    match: /remind|reminder|tomorrow|calendar|meeting/i,
    text: 'Done. I set a reminder for **tomorrow at 9:15** with the note you gave me. I also noticed you have the design review at 10:00, so I placed it early enough to leave you a quiet buffer before it starts.'
  },
  {
    match: /recipe|cook|dinner|lunch|eat/i,
    text: 'Here is something simple for tonight with what you mentioned:\n\n1. **Lemon garlic orzo** — toast 200 g orzo in olive oil, add 500 ml stock, simmer 10 minutes.\n2. Stir in spinach, lemon zest and a spoon of butter.\n3. Finish with parmesan and black pepper.\n\nAbout 20 minutes, one pan. If you want protein, a can of white beans folds in nicely at step 2.'
  },
  {
    match: /code|bug|function|typescript|python|error|script/i,
    text: 'The issue is that the promise is created inside the loop but never awaited, so the function returns before the writes finish. Collect them and await together:\n\n```ts\nconst writes = files.map((file) => fs.writeFile(file.path, file.content))\nawait Promise.all(writes)\n```\n\nIf order matters, keep a plain `for...of` with `await` inside instead. I can run the test suite again once you have saved the change.'
  },
  {
    match: /summar|tl;?dr|article|read/i,
    text: 'Here is the short version:\n\n- The main point is that smaller, steady habits outperform big occasional pushes.\n- The author backs it with two studies, though both have small samples.\n- The practical takeaway is to pick one routine and protect it for a month before adding another.\n\nI would treat the conclusions as encouraging rather than definitive.'
  },
  {
    match: /translate|french|spanish|japanese|german/i,
    text: 'Here is a natural translation:\n\n> « Merci encore pour ton aide hier, ça m’a vraiment enlevé une épine du pied. »\n\n"Enlever une épine du pied" is the idiomatic way to say it took a weight off you — friendlier than a literal translation.'
  }
]

function lastUserText(messages = []) {
  // Leon wraps the owner's words in <user_request> and appends runtime context
  // as separate user messages, so prefer the latest explicit request.
  for (let index = messages.length - 1; index >= 0; index--) {
    const content = messages[index]?.content
    const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((part) => part?.text || '').join(' ') : ''
    const request = text.match(/<user_request>\s*([\s\S]*?)\s*<\/user_request>/)
    if (request) {
      return request[1]
    }
  }
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.role !== 'user') {
      continue
    }
    if (typeof message.content === 'string') {
      return message.content
    }
    if (Array.isArray(message.content)) {
      return message.content.map((part) => part?.text || '').join(' ')
    }
  }
  return ''
}

function answerFor(question) {
  const found = ANSWERS.find((answer) => answer.match.test(question))
  if (found) {
    return found.text
  }
  const topic = question.trim().replace(/\s+/g, ' ').slice(0, 80)
  return topic
    ? `Good question. Thinking about “${topic}”, the short answer is that it depends mostly on how much time you want to give it this week. My suggestion: start with the smallest useful step today, note what felt awkward, and we can adjust tomorrow. Want me to turn that into a short checklist?`
    : 'I am here. What would you like to work on?'
}

function titleFor(question) {
  const words = question.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 6)
  if (!words.length) {
    return 'Quick chat'
  }
  const title = words.join(' ')
  return title.charAt(0).toUpperCase() + title.slice(1)
}

// Builds a plausible value for a JSON schema (structured-output requests).
function fromSchema(schema, key, question) {
  if (!schema || typeof schema !== 'object') {
    return null
  }
  if (Array.isArray(schema.enum) && schema.enum.length) {
    return schema.enum[0]
  }
  if (schema.const !== undefined) {
    return schema.const
  }
  const options = schema.anyOf || schema.oneOf
  if (Array.isArray(options) && options.length) {
    return fromSchema(options.find((option) => option.type !== 'null') || options[0], key, question)
  }
  const type = Array.isArray(schema.type) ? schema.type.find((item) => item !== 'null') : schema.type
  switch (type) {
    case 'object': {
      const result = {}
      for (const [name, child] of Object.entries(schema.properties || {})) {
        result[name] = fromSchema(child, name, question)
      }
      return result
    }
    case 'array':
      return schema.minItems ? [fromSchema(schema.items, key, question)] : []
    case 'boolean':
      return false
    case 'integer':
    case 'number':
      return schema.minimum ?? 0
    case 'string':
      return /title|name/i.test(key || '') ? titleFor(question) : answerFor(question)
    default:
      return null
  }
}

function completionText(body) {
  const question = lastUserText(body.messages)
  const format = body.response_format
  if (format?.type === 'json_schema') {
    return JSON.stringify(fromSchema(format.json_schema?.schema, '', question))
  }
  if (format?.type === 'json_object') {
    return JSON.stringify({ title: titleFor(question), answer: answerFor(question) })
  }
  return answerFor(question)
}

function usage(text) {
  const completion = Math.max(1, Math.round(text.length / 4))
  return { prompt_tokens: 1_850, completion_tokens: completion, total_tokens: 1_850 + completion, cost: 0.0042 }
}

function sendJSON(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(value))
}

const server = http.createServer((request, response) => {
  let raw = ''
  request.on('data', (chunk) => {
    raw += chunk
  })
  request.on('end', () => {
    const url = new URL(request.url, 'http://localhost')
    if (request.method === 'GET' && url.pathname.endsWith('/models')) {
      sendJSON(response, 200, { data: [{ id: 'anthropic/claude-sonnet-5.5', name: 'Anthropic: Claude Sonnet 5.5', context_length: 400_000 }] })
      return
    }
    if (request.method === 'GET' && url.pathname.endsWith('/key')) {
      sendJSON(response, 200, { data: { label: 'sk-or-v1-loc...', usage: 12.84, limit: null, is_free_tier: false } })
      return
    }
    if (request.method !== 'POST' || !url.pathname.endsWith('/chat/completions')) {
      sendJSON(response, 404, { error: { message: 'Not found', code: 404 } })
      return
    }

    let body = {}
    try {
      body = JSON.parse(raw || '{}')
    } catch {
      sendJSON(response, 400, { error: { message: 'Invalid JSON', code: 400 } })
      return
    }

    if (process.env.LLM_STUB_DUMP) {
      fs.appendFileSync(process.env.LLM_STUB_DUMP, JSON.stringify(body) + "\n")
    }
    const id = `gen-${randomUUID()}`
    const created = Math.floor(Date.now() / 1_000)
    const model = body.model || 'anthropic/claude-sonnet-5.5'
    const text = completionText(body)

    if (!body.stream) {
      sendJSON(response, 200, {
        id, object: 'chat.completion', created, model, provider: 'Anthropic',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }],
        usage: usage(text)
      })
      return
    }

    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const pieces = text.match(/[\s\S]{1,24}/g) || ['']
    const send = (payload) => response.write(`data: ${JSON.stringify(payload)}\n\n`)
    send({ id, object: 'chat.completion.chunk', created, model, provider: 'Anthropic', choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })
    let index = 0
    const timer = setInterval(() => {
      if (index < pieces.length) {
        send({ id, object: 'chat.completion.chunk', created, model, provider: 'Anthropic', choices: [{ index: 0, delta: { content: pieces[index++] }, finish_reason: null }] })
        return
      }
      clearInterval(timer)
      send({ id, object: 'chat.completion.chunk', created, model, provider: 'Anthropic', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: usage(text) })
      response.write('data: [DONE]\n\n')
      response.end()
    }, 25)
    response.on('close', () => clearInterval(timer))
  })
})

server.on('error', (error) => {
  console.error(`LLM stub could not listen on ${port}: ${error.message}`)
})
server.unref()
server.listen(port, '127.0.0.1', () => {
  console.log(`LLM stub (OpenRouter-compatible) listening on http://127.0.0.1:${port}/api/v1`)
})
