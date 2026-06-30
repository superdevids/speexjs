# Product Requirements Document — SpeexJS v2.x
## Volume 5 — AI-Native Developer Platform

> **Version:** 2.1.3
> **Status:** 🚧 8/10 Features Implemented — F1-F7, F9, F10 done; F8 pending
> **Last Updated:** 2026-06-30
> **Filosofi:** "Framework yang tidak hanya mengeksekusi kode, tapi memahami intent developer."

---

## 1. Executive Summary

PRD01-PRD05 telah membangun SpeexJS menjadi framework fullstack TypeScript terlengkap dengan **550+ fitur, 33 CLI commands, ~2,400 tests, 0 TypeScript errors, zero dependencies**. Semua PRD sebelumnya sudah 100% terimplementasi di v2.1.1.

PRD06 ini mendefinisikan **era AI-Native** SpeexJS — di mana framework tidak hanya menjadi alat, tapi menjadi **partner developer** yang memahami konteks, intent, dan codebase.

### Visi
> _"From 'what you code' to 'what you intend'."_

### Target Rilis
| Target | Version | Timeline |
|--------|---------|----------|
| AI Integration | v2.2 | Q2 2027 |
| Agent Platform | v2.3 | Q3 2027 |
| Full AI-Native | v4.0 | Q1 2028 |

---

## 2. Already Implemented Foundation

AI features already built in `v2.1.1` (foundation for PRD06):

### AI Agent SDK (`speexjs/server/ai/agent.ts`)
- Tool registration with typed parameters
- Built-in tools: web search (via `searchWeb`), URL fetch (`fetchURL`), code execution (`runCode`)
- Rate limiting per agent session
- Message history tracking
- `AIAgent` class with `run()`, `addSystemMessage()`, `addUserMessage()`, tool dispatch

### Natural Language Query (`speexjs/server/ai/nlquery.ts`)
- Parse English sentences into database queries
- Supports SELECT, WHERE, ORDER BY, LIMIT operations
- Field mapping, stop word filtering, join detection
- `NaturalLanguageQuery` class with `parse()`, `toSQL()`, `execute()` methods

### Vector Search (`speexjs/server/search/vector.ts`)
- Cosine similarity computation
- Text chunking with overlap support
- `VectorStore` with `addDocument()`, `similaritySearch()`, vector persistence

### RAG Pipeline (`speexjs/server/search/rag.ts`)
- Document ingestion and chunking
- Retrieval-augmented generation context building
- `RAGPipeline` class with `addDocument()`, `query()`, `buildContext()` methods

### Search Engine (`speexjs/server/search/index.ts`)
- Full-text search via TF-IDF indexing
- Fuzzy search with Levenshtein distance (typo tolerance ≤ 1)
- Relevance scoring with TF-IDF
- Result highlighting with `<mark>` tags
- PostgreSQL tsvector/tsquery helpers
- `SearchEngine`, `TfIdfIndex`, `SearchQueryBuilder` classes

**Next step:** F1 (Prompt Management) and F2 (Embedding Providers) — these are the highest-impact additions to unlock the full AI-Native vision.

---

## 3. Feature Proposals

### F1 — Prompt Management System

**Priority:** P1
**Effort:** M
**Target:** v2.2

#### Problem
Developer menggunakan AI (ChatGPT, Claude, Copilot) secara terpisah dari framework. Tidak ada integrasi, tidak ada versioning prompt, tidak ada template yang konsisten.

#### Solution
Built-in prompt management dengan SpeexJS:
- Prompt templates dengan variables
- Version history untuk setiap prompt
- A/B testing prompt variants
- Performance tracking per prompt

```typescript
// speexjs.config.ts
export default defineConfig({
  ai: {
    prompts: {
      dir: 'resources/prompts',
      provider: 'anthropic', // or 'openai', 'ollama'
      apiKey: process.env.AI_API_KEY,
    },
  },
})
```

#### Acceptance Criteria
- [ ] Prompt template engine dengan variable interpolation
- [ ] Version history dengan rollback
- [ ] A/B testing prompt variants
- [ ] Performance dashboard untuk prompt metrics
- [ ] Zero additional dependencies

---

### F2 — Embedding & Vector Providers

**Priority:** P1
**Effort:** M
**Target:** v2.2

#### Problem
Vector search (TF-IDF) sudah ada di v2.1, tapi belum ada integrasi dengan embedding providers modern untuk semantic search.

#### Solution
Integrasi dengan multiple embedding providers:
- OpenAI embeddings (text-embedding-3-small/large)
- Anthropic embeddings
- Cohere embeddings
- Local embeddings via Ollama

```typescript
import { EmbeddingProvider } from 'speexjs/server/ai'
import { VectorStore } from 'speexjs/server/search'

const embed = new EmbeddingProvider({
  provider: 'openai',
  model: 'text-embedding-3-small',
})

const store = new VectorStore(embed)
await store.addDocument('SpeexJS is a fullstack framework...')
const results = await store.similaritySearch('TypeScript framework')
```

#### Acceptance Criteria
- [ ] Support 4+ embedding providers
- [ ] Semantic search via embeddings
- [ ] Auto-fallback antara TF-IDF dan semantic search
- [ ] Batch embedding untuk large datasets

---

### F3 — LLM Provider SDK

**Priority:** P2
**Effort:** L
**Target:** v2.2

#### Problem
Tidak ada unified API untuk berbagai LLM provider. Developer harus implement sendiri integrasi dengan OpenAI, Anthropic, Google, local models.

#### Solution
Unified LLM SDK dengan adapter pattern:
- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude 3/4)
- Google (Gemini)
- Ollama (local models)
- Custom provider adapter

```typescript
import { LLM } from 'speexjs/server/ai'

const llm = new LLM({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Streaming response
const stream = await llm.generateStream('Explain SpeexJS')
for await (const chunk of stream) {
  process.stdout.write(chunk)
}

// Structured output
const result = await llm.generateStructured({
  prompt: 'Generate a SpeexJS model for a blog post',
  schema: PostSchema,
})
```

#### Acceptance Criteria
- [ ] Support 4+ LLM providers
- [ ] Streaming response support
- [ ] Structured output generation
- [ ] Tool/function calling
- [ ] Token usage tracking & cost estimation

---

### F4 — Semantic Caching

**Priority:** P2
**Effort:** L
**Target:** v2.3

#### Problem
LLM responses are expensive and slow. Caching exact matches doesn't help for semantically similar queries.

#### Solution
Semantic cache yang menggunakan vector similarity untuk cache lookups:
- Cache LLM responses berdasarkan semantic similarity
- Configurable similarity threshold (default: 0.92)
- TTL-based cache invalidation
- Hybrid cache (exact + semantic)

```typescript
import { SemanticCache } from 'speexjs/server/cache'

const cache = new SemanticCache({
  embedder: embed,
  threshold: 0.92,
  ttl: 3600,
})

const response = await cache.getOrCompute(
  'What is SpeexJS?',
  () => llm.generate('What is SpeexJS?'),
)
```

#### Acceptance Criteria
- [ ] Semantic similarity-based cache lookup
- [ ] Configurable threshold per use case
- [ ] TTL-based automatic invalidation
- [ ] Hybrid exact + semantic cache
- [ ] Cache hit rate monitoring

---

### F5 — AI-Powered Code Generation

**Priority:** P1
**Effort:** XL
**Target:** v2.3

#### Problem
`speexjs generate:app` sudah ada tapi menggunakan template-based generation. Belum ada AI-powered generation yang paham konteks project.

#### Solution
AI-powered code generator yang:
- Memahami schema existing project
- Mengikuti konvensi codebase
- Generate type-safe code
- Auto-create tests
- Review & suggest improvements

```bash
# Generate full CRUD with AI
speexjs ai:generate "Buat sistem booking untuk clinic gigi"
# → Model, Controller, Routes, Migration, Tests, UI

# Explain existing code
speexjs ai:explain src/controllers/BookingController.ts

# Review code
speexjs ai:review src/ --fix

# Generate missing tests
speexjs ai:test src/controllers/
```

#### Acceptance Criteria
- [ ] Natural language → production code generation
- [ ] Context-aware (paham schema & conventions yang sudah ada)
- [ ] Auto-generate tests untuk semua generated code
- [ ] Code review dengan fix suggestions
- [ ] Explain mode untuk existing code

---

### F6 — Content Moderation

**Priority:** P2
**Effort:** M
**Target:** v2.3

#### Problem
User-generated content perlu moderasi untuk toxicity, PII, spam. Saat ini developer harus integrasi sendiri dengan third-party services.

#### Solution
Built-in content moderation dengan multiple backends:
- Pattern-based filtering (regex untuk spam, PII)
- ML-based toxicity detection (optional)
- Configurable actions: flag, block, review

```typescript
import { Moderator } from 'speexjs/server/ai'

const mod = new Moderator({
  rules: {
    pii: true,         // Deteksi email, phone, SSN
    toxicity: false,    // Butuh API key untuk ML detection
    spam: true,         // URL spam, repetitive content
    custom: [           // Custom regex rules
      { pattern: /discord\.gg/, action: 'flag' },
    ],
  },
})

const result = await mod.check('Contact me at admin@example.com')
// → { safe: false, flags: ['pii:email'], actions: ['mask'] }
```

#### Acceptance Criteria
- [ ] PII detection (email, phone, SSN, credit card)
- [ ] Spam detection (URL patterns, repetition)
- [ ] Toxicity detection (optional ML backend)
- [ ] Custom rule engine dengan regex
- [ ] Configurable actions: flag, block, mask, review

---

### F7 — AI Agent Platform

**Priority:** P2
**Effort:** XL
**Target:** v2.4

#### Problem
`speexjs make:agent` sudah ada tapi agent framework masih basic. Belum ada tool calling, memory, multi-agent orchestration, atau persistent state.

#### Solution
Full AI Agent platform:
- Tool definition & function calling
- Persistent memory (short-term + long-term)
- Multi-agent orchestration
- Agent-as-a-Service via API
- Built-in tools: database query, file system, web search, email

```typescript
import { Agent, Tool } from 'speexjs/server/ai'

const agent = new Agent({
  name: 'DataAnalyst',
  instructions: 'You are a data analyst. Help users query their database.',
  tools: [
    new Tool({
      name: 'query_database',
      description: 'Execute SQL queries',
      parameters: {
        sql: { type: 'string', description: 'The SQL query to execute' },
      },
      execute: async ({ sql }) => db.raw(sql),
    }),
    new Tool({
      name: 'generate_chart',
      description: 'Generate a chart from data',
      parameters: {
        data: { type: 'string' },
        chartType: { type: 'string', enum: ['bar', 'line', 'pie'] },
      },
    }),
  ],
  memory: {
    type: 'persistent',
    store: 'database',
    ttl: '7d',
  },
})

// Run agent
const result = await agent.run('Show me monthly revenue for 2026')
```

#### Acceptance Criteria
- [ ] Tool definition with typed parameters
- [ ] Function calling execution
- [ ] Persistent memory (short + long term)
- [ ] Multi-agent orchestration
- [ ] Agent-as-a-Service endpoint
- [ ] Built-in tool library
- [ ] Agent monitoring dashboard

---

### F8 — AI-Powered Admin Panel

**Priority:** P3
**Effort:** XL
**Target:** v4.0

#### Problem
Admin panel (v2.0) sudah ada dengan CRUD generator. Tapi masih manual — developer harus configure fields, filters, actions.

#### Solution
AI-powered admin panel yang auto-configure dari model schema:
- Natural language queries untuk data
- Auto-generated reports & charts
- Anomaly detection
- Smart search dengan semantic understanding

```typescript
// speexjs make:admin --ai User
// → Auto-generate admin panel dengan AI features

// Natural language query di admin panel
// "Tampilkan user yang registrasi bulan ini dan punya >5 orders"
// → Auto SQL generation → results
```

#### Acceptance Criteria
- [ ] Auto-configure admin dari model schema
- [ ] Natural language data query
- [ ] Auto-generated visualizations
- [ ] Anomaly detection for key metrics
- [ ] Smart search across all entities

---

### F9 — Autonomous Agent Loop

**Priority:** P3
**Effort:** XL
**Target:** v4.0

#### Problem
Developer masih harus manual menulis kode. Framework harus bisa autonomously plan, execute, dan evaluate tasks.

#### Solution
Built-in autonomous agent loop: Plan → Execute → Evaluate → Iterate
- Goal-based task decomposition
- Self-correcting execution
- Quality evaluation after each step
- Persistent learning from past sessions

```typescript
import { AutonomousLoop } from 'speexjs/server/ai'

const loop = new AutonomousLoop({
  goal: 'Buat fitur reset password',
  context: {
    projectDir: process.cwd(),
    conventions: await detectConventions(),
  },
  maxIterations: 10,
  qualityGate: 0.85,
})

const result = await loop.run()
// 1. Plan: Analyze requirements
// 2. Execute: Generate files
// 3. Evaluate: Run tests, check coverage
// 4. Iterate: Fix issues
// 5. Report: Summary of changes
```

#### Acceptance Criteria
- [ ] Goal-based task decomposition
- [ ] Autonomous code generation
- [ ] Self-correction on failure
- [ ] Quality evaluation after each step
- [ ] Learning from past iterations

---

### F10 — AI Developer Assistant (CLI)

**Priority:** P2
**Effort:** M
**Target:** v2.4

#### Problem
Developer harus tahu command speexjs yang mana untuk task apa. Tidak ada "AI assistant" yang bisa membantu di terminal.

#### Solution
AI-powered CLI assistant:
```bash
# Natural language commands
speexjs ai "buatkan migration untuk tabel products"
speexjs ai "jelaskan arsitektur project ini"
speexjs ai "optimasi query di UserController"
speexjs ai "apa yang salah dengan test ini?"

# Interactive mode
speexjs ai --interactive
> 🧠 SpeexJS AI Assistant aktif. Tanya apa aja!
> "bagaimana cara deploy ke production?"
> 📋 Langkah-langkah deploy:
>   1. speexjs build
>   2. speexjs deploy --target docker
>   ...
```

#### Acceptance Criteria
- [ ] Natural language → command translation
- [ ] Code explanation
- [ ] Debug assistance
- [ ] Best practice suggestions
- [ ] Interactive mode with context

---

### Implementation Status

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| AI Agent SDK | 🟢 Implemented | `agent.ts` — tool calling, rate limiting, built-in tools |
| NL Query Engine | 🟢 Implemented | `nlquery.ts` — English-to-DB-query parser |
| Vector Search | 🟢 Implemented | `vector.ts` — cosine similarity, VectorStore |
| RAG Pipeline | 🟢 Implemented | `rag.ts` — ingestion, retrieval, context building |
| F1 — Prompt Management | 🟢 Implemented | `prompts.ts` — template engine, versioning, A/B testing, tracking |
| F2 — Embedding Providers | 🟢 Implemented | `embedding.ts` — OpenAI, Anthropic, Cohere, Ollama + fallback |
| F3 — LLM Provider SDK | 🟢 Implemented | `llm.ts` — 4 providers, streaming, structured output, tool calling |
| F4 — Semantic Caching | 🟢 Implemented | `semantic-cache.ts` — cosine similarity, hybrid cache, LRU, TTL |
| F5 — AI Code Generation | 🟢 Implemented | `ai-commands.ts` — template-based `ai:generate` with field detection |
| F6 — Content Moderation | 🟢 Implemented | `moderator.ts` — PII, spam, toxicity, custom rules |
| F7 — AI Agent Platform | 🟢 Implemented | `agent.ts`, `agent-memory.ts`, `agent-orchestrator.ts` — full platform |
| F8 — AI Admin Panel | 🔴 Not Started | Future scope |
| F9 — Autonomous Loop | 🟢 Implemented | `autonomous-loop.ts` — Plan→Execute→Evaluate→Iterate + learning |
| F10 — AI CLI Assistant | 🟢 Implemented | `ai-commands.ts` — `ai:generate`, `ai:explain`, `ai:review`, `ai:test`, `ai:fix` |

---

## 4. Priority Matrix

| Feature | Priority | Effort | Nilai | Target |
|---------|----------|--------|-------|--------|
| F1 — Prompt Management | P1 | M | ⭐⭐⭐⭐ | v2.2 |
| F2 — Embedding Providers | P1 | M | ⭐⭐⭐⭐ | v2.2 |
| F3 — LLM Provider SDK | P2 | L | ⭐⭐⭐⭐⭐ | v2.2 |
| F4 — Semantic Caching | P2 | L | ⭐⭐⭐⭐ | v2.3 |
| F5 — AI Code Generation | P1 | XL | ⭐⭐⭐⭐⭐ | v2.3 |
| F6 — Content Moderation | P2 | M | ⭐⭐⭐ | v2.3 |
| F7 — AI Agent Platform | P2 | XL | ⭐⭐⭐⭐⭐ | v2.4 |
| F8 — AI Admin Panel | P3 | XL | ⭐⭐⭐⭐ | v4.0 |
| F9 — Autonomous Loop | P3 | XL | ⭐⭐⭐⭐⭐ | v4.0 |
| F10 — AI CLI Assistant | P2 | M | ⭐⭐⭐⭐ | v2.4 |

---

## 5. Dependencies

```
F1 (Prompts) ──────► F3 (LLM SDK)
                       ├──► F4 (Semantic Cache)
                       ├──► F5 (AI Code Gen)
                       ├──► F7 (Agent Platform)
                       └──► F10 (AI CLI)

F2 (Embeddings) ───► F4 (Semantic Cache)
                       └──► F6 (Content Moderation)

F5 (AI Code Gen) ───► F8 (AI Admin Panel)
F7 (Agent Platform) ─► F9 (Autonomous Loop)
```

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| AI Code Gen acceptance rate | > 80% |
| LLM provider integrations | 4+ |
| Average response time (LLM) | < 2s |
| Semantic cache hit rate | > 60% |
| Agent task completion rate | > 85% |
| CLI AI assistant usage | > 50% of devs |
