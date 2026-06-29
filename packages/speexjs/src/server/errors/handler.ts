import type { RouteContext } from '../router'
import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ValidationException,
  BadRequestException,
  ForbiddenException,
} from '../errors.js'

export interface ErrorHint {
  title: string
  message: string
  suggestion: string
  docsUrl?: string
  file?: string
  line?: number
}

interface RecentError {
  timestamp: number
  hint: ErrorHint
}

const recentErrors: RecentError[] = []
const MAX_RECENT_ERRORS = 50

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}

function parseStack(stack: string): { file: string; line: number } | null {
  const match = stack.match(/\s+at\s+(?:.*?\s+)?\(?(.+?):(\d+):\d+\)?/)
  if (match && match[1] !== undefined) {
    return { file: match[1], line: Number(match[2]) }
  }
  return null
}

function classifyError(err: Error): ErrorHint {
  const msg = err.message.toLowerCase()

  if (msg.includes('connect') && (msg.includes('database') || msg.includes('host') || msg.includes('port') || msg.includes('db_'))) {
    return {
      title: 'Database Connection Error',
      message: err.message,
      suggestion: 'Cannot connect to database. Check DATABASE_URL in your .env file or verify your connection configuration.',
      docsUrl: 'https://speexjs.dev/docs/database',
    }
  }

  if (err instanceof ValidationException || err.name === 'ValidationError' || msg.includes('validation') || msg.includes('validate')) {
    let fieldHint = ''
    if (err instanceof ValidationException && 'errors' in err) {
      const errs = (err as ValidationException).errors
      if (errs) {
        fieldHint = Object.entries(errs)
          .map(([field, msgs]) => `"${field}": ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ')
      }
    }
    return {
      title: 'Validation Error',
      message: err.message,
      suggestion: fieldHint
        ? `The following fields failed validation: ${fieldHint}. Check the request body for correct types and values.`
        : 'Check the request body for missing or invalid fields. Ensure all required fields are present and have the correct type.',
      docsUrl: 'https://speexjs.dev/docs/validation',
    }
  }

  if (
    err instanceof UnauthorizedException ||
    err instanceof ForbiddenException ||
    msg.includes('unauthorized') ||
    msg.includes('unauthenticated') ||
    msg.includes('forbidden')
  ) {
    return {
      title: err instanceof ForbiddenException ? 'Authorization Error' : 'Authentication Error',
      message: err.message,
      suggestion:
        err instanceof ForbiddenException
          ? 'You do not have permission to access this resource. Check your user roles and permissions.'
          : 'Did you forget to add auth middleware? Use `router.use(authMiddleware())` or ensure a valid token is provided.',
      docsUrl: 'https://speexjs.dev/docs/authentication',
    }
  }

  if (err instanceof NotFoundException || err instanceof BadRequestException || msg.includes('not found') || msg.includes('not_found')) {
    return {
      title: 'Route Not Found',
      message: err.message,
      suggestion: 'Did you forget to register this route? Check your routes file or ensure the URL is correct.',
      docsUrl: 'https://speexjs.dev/docs/routing',
    }
  }

  return {
    title: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    suggestion: 'Check the stack trace above. If this persists, enable debug mode (NODE_ENV=development) for more details.',
    docsUrl: 'https://speexjs.dev/docs/errors',
  }
}

function renderDevErrorPage(err: Error, hint: ErrorHint): string {
  const stack = err.stack || err.message || ''
  const stackLines = stack.split('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(hint.title)} - SpeexJS Error</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #0f1117; color: #e1e4e8; line-height: 1.6; padding: 2rem;
  }
  .container { max-width: 960px; margin: 0 auto; }
  .header {
    background: linear-gradient(135deg, #f85149, #d73a49);
    border-radius: 8px; padding: 1.5rem 2rem; margin-bottom: 1.5rem;
  }
  .header h1 { font-size: 1.5rem; color: #fff; }
  .header .status { font-size: 0.875rem; color: rgba(255,255,255,0.8); margin-top: 0.25rem; }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem 2rem; margin-bottom: 1.5rem;
  }
  .card h2 { font-size: 1rem; color: #f0f6fc; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
  .card h2 .badge {
    font-size: 0.7rem; background: #1f6feb; color: #fff; padding: 0.15rem 0.5rem; border-radius: 12px;
  }
  .message { font-size: 1.1rem; color: #f0f6fc; margin-bottom: 0.25rem; }
  .suggestion {
    background: #1c2128; border-left: 3px solid #d29922; padding: 0.75rem 1rem; border-radius: 6px;
    color: #e3b341; font-size: 0.9rem; margin-top: 0.5rem;
  }
  .suggestion strong { color: #f0f6fc; }
  .stack {
    background: #0d1117; padding: 1rem; border-radius: 6px; overflow-x: auto;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; line-height: 1.5;
  }
  .stack .line { color: #8b949e; }
  .stack .file { color: #79c0ff; text-decoration: underline; }
  .stack .file:hover { color: #58a6ff; }
  .meta { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; font-size: 0.875rem; }
  .meta dt { color: #8b949e; }
  .meta dd { color: #e1e4e8; }
  .meta a { color: #58a6ff; text-decoration: underline; }
  .recent { list-style: none; }
  .recent li { padding: 0.5rem 0; border-bottom: 1px solid #21262d; font-size: 0.875rem; }
  .recent li:last-child { border-bottom: none; }
  .recent .time { color: #8b949e; font-size: 0.75rem; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${escapeHtml(hint.title)}${hint.file ? ' at ' + escapeHtml(hint.file) + ':' + hint.line : ''}</h1>
    <div class="status">SpeexJS Development Error Page</div>
  </div>
  <div class="card">
    <h2>Error Message</h2>
    <div class="message">${escapeHtml(hint.message)}</div>
  </div>
  <div class="card">
    <h2>Suggested Fix</h2>
    <div class="suggestion"><strong>Tip:</strong> ${escapeHtml(hint.suggestion)}</div>
  </div>
  ${hint.docsUrl ? `<div class="card"><h2>Documentation</h2><div class="meta"><dt>Link</dt><dd><a href="${hint.docsUrl}" target="_blank">${hint.docsUrl}</a></dd></div></div>` : ''}
  <div class="card">
    <h2>Stack Trace</h2>
    <div class="stack">${stackLines
      .map((line) => {
        const fileMatch = line.match(/(.+?):(\d+):\d+\)?\s*$/)
        if (fileMatch && fileMatch[1] !== undefined) {
          const filePath = fileMatch[1]
          const lineNo = fileMatch[2] as string
          const prefix = line.substring(0, line.indexOf(filePath))
          return `<div>${escapeHtml(prefix)}<span class="file">${escapeHtml(filePath)}:${lineNo}</span>)</div>`
        }
        return `<div>${escapeHtml(line)}</div>`
      })
      .join('\n')}</div>
  </div>
  ${
    recentErrors.length > 0
      ? `<div class="card"><h2>Recent Similar Errors <span class="badge">${recentErrors.length}</span></h2><ul class="recent">${recentErrors
          .slice(-10)
          .reverse()
          .map(
            (r) =>
              `<li><span class="time">${new Date(r.timestamp).toLocaleTimeString()}</span> - ${escapeHtml(r.hint.title)}: ${escapeHtml(r.hint.message)}</li>`,
          )
          .join('')}</ul></div>`
      : ''
  }
</div>
</body>
</html>`
}

function renderProductionErrorPage(status: number): string {
  const is404 = status === 404
  const title = is404 ? 'Page Not Found' : 'Internal Server Error'
  const message = is404 ? 'The page you requested could not be found.' : 'An unexpected error occurred. Please try again later.'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - SpeexJS</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #0f1117; color: #e1e4e8; display: flex; align-items: center; justify-content: center;
    min-height: 100vh; text-align: center; padding: 2rem;
  }
  .container { max-width: 480px; }
  .code { font-size: 4rem; font-weight: 800; line-height: 1; margin-bottom: 0.5rem; }
  .code-404 { color: #d29922; }
  .code-500 { color: #f85149; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #f0f6fc; }
  p { color: #8b949e; margin-bottom: 1.5rem; }
  a { color: #58a6ff; text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
  <div class="code ${is404 ? 'code-404' : 'code-500'}">${status}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/">Go Home</a>
</div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function getStatusFromError(err: Error): number {
  if (err instanceof HttpException) return err.status
  return 500
}

export class SmartErrorHandler {
  handle(): (err: Error, ctx: RouteContext) => Promise<void> {
    return async (err: Error, ctx: RouteContext) => {
      const hint = classifyError(err)

      const stackInfo = err.stack ? parseStack(err.stack) : null
      if (stackInfo) {
        hint.file = stackInfo.file
        hint.line = stackInfo.line
      }

      recentErrors.push({ timestamp: Date.now(), hint })
      if (recentErrors.length > MAX_RECENT_ERRORS) {
        recentErrors.shift()
      }

      const status = getStatusFromError(err)

      if (isDev()) {
        const html = renderDevErrorPage(err, hint)
        ctx.response.status(status).type('text/html; charset=utf-8').send(html)
      } else {
        const html = renderProductionErrorPage(status)
        ctx.response.status(status).type('text/html; charset=utf-8').send(html)
      }
    }
  }

  getRecentErrors(): RecentError[] {
    return [...recentErrors]
  }

  clearRecentErrors(): void {
    recentErrors.length = 0
  }
}
