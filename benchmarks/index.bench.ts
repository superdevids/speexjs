import { bench, run } from 'mitata'
import { speexjs } from '../src/server/index.js'
import { SuperRequest } from '../src/server/http/request.js'
import { SuperResponse } from '../src/server/http/response.js'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { schema } from '../src/schema/index.js'

function mockReq(method: string, path: string): SuperRequest {
  const socket = new Socket()
  const msg = new IncomingMessage(socket)
  msg.method = method
  msg.url = path
  return new SuperRequest(msg as any)
}

function mockRes(): SuperResponse {
  return new SuperResponse(new ServerResponse(new IncomingMessage(new Socket())) as any)
}

const app = speexjs()
app.get('/hello', async ({ response }) => response.json({ message: 'Hello, World!' }))
app.get('/users/:id', async ({ response, params }) => response.json({ id: params.id }))

const UserSchema = schema.object({
  name: schema.string().min(3),
  email: schema.string().email(),
  age: schema.number().min(18),
})

bench('Router - static route', async () => {
  const req = mockReq('GET', '/hello')
  const res = mockRes()
  await (app as any).handleRequest(req, res)
})

bench('Router - dynamic param', async () => {
  const req = mockReq('GET', '/users/42')
  const res = mockRes()
  await (app as any).handleRequest(req, res)
})

bench('Router - 404 not found', async () => {
  const req = mockReq('GET', '/nonexistent')
  const res = mockRes()
  await (app as any).handleRequest(req, res)
})

bench('Schema - simple parse', () => {
  schema.string().parse('hello world')
})

bench('Schema - object parse', () => {
  UserSchema.parse({ name: 'John Doe', email: 'john@test.com', age: 25 })
})

bench('Schema - parse error', () => {
  try { schema.number().parse('not-a-number') } catch {}
})

await run()
