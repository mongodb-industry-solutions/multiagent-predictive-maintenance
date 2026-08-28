# AGENTS.md

Guidance for AI coding agents working in this repository.

This is a Next.js 15 (App Router) demo of a multi-agent predictive maintenance
system. Agent workflows are orchestrated with LangGraph.js, state is persisted in
MongoDB Atlas, and retrieval uses Atlas Vector Search.

## Build and test commands

```bash
npm install              # install dependencies (Node.js 20+)
npm run seed             # first-time only: seed collections, embeddings, indexes
npm run dev              # dev server on http://localhost:8080
npm run build            # production build
npm run lint             # ESLint
```

Supporting scripts:

```bash
npm run embed                  # re-embed configured collections, refresh vector indexes
npm run generate_calendar 6    # regenerate production_calendar (destructive, see below)
npm run tpn                    # regenerate THIRD-PARTY-NOTICES.md
```

**There is no automated test suite in this repository.** `npm test` does not
exist. To verify a change, run `npm run build` and `npm run lint`, then exercise
the affected page in the browser. Do not claim tests pass — there are none.

Smoke check after a change:

1. `npm run dev`
2. Open `http://localhost:8080/failure-prediction`
3. Click **Start Simulator**, raise Temperature above 90 (or Vibration above 1.2)
4. An `E12`/`E13` alert appears, the agent status list turns green, and an
   incident report is written to the `incident_reports` collection

## Project structure

```
src/
  agents/            LangGraph agent definitions (one folder per agent)
    failure/         root-cause analysis from telemetry alerts
    workorder/       drafts work orders from incident reports
    planning/        schedules work against production calendar and staff
    supervisor/      routes between agents
    test/            template to copy when adding a new agent
    callAgent.js     shared agent invocation and streaming
  app/
    api/             route handlers (see API overview below)
    failure-prediction/    Root Cause Analysis page
    workorder-generation/  Work Order Generation page
    workorder-scheduler/   Work Order Scheduler page
    agent-sandbox/         manual agent testing UI
  components/        React UI components (LeafyGreen + MUI)
  integrations/
    mongodb/client.js        MongoClient singleton — sets appName
    mongodb/vectorSearch.js  vector index creation and $vectorSearch queries
    chat_factory.js          provider selector: bedrock | grove
    embeddings_factory.js    provider selector: bedrock | voyage
    bedrock/ grove/ voyageai/  provider implementations
  lib/
    simulation/      telemetry generation and threshold-based alerting
    api/             client-side fetch wrappers
scripts/
  seed.mjs                 one-shot database setup
  embed_collections.mjs    embedding + vector index creation
  config.js                which collections/fields get embedded
data/                      seed JSON documents
```

Notable files:

- [src/integrations/mongodb/client.js](./src/integrations/mongodb/client.js) —
  the only place `appName` is set. Do not remove it when editing connection code.
- [scripts/config.js](./scripts/config.js) — embedding configuration. Field names
  here must match the actual document fields or the text is silently skipped.
- [src/lib/simulation/failureDetection.js](./src/lib/simulation/failureDetection.js) —
  alert thresholds (temperature > 90, vibration > 1.2).

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/action/[action]` | Generic MongoDB data access (`find`, `insertOne`, …). Parses the body with `EJSON` so BSON types survive. |
| POST | `/api/chat` | Invoke an agent and stream the response |
| POST | `/api/chat/[threadId]` | Continue an existing agent thread |
| GET | `/api/agent/options` | List available agents |
| GET | `/api/agent/visualize` | Return an agent's graph structure |

## Environment variables and configuration

Copy `.env.example` to `.env` (`cp .env.example .env`) and fill in the values.

| Name | Required | Example | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | yes | `mongodb+srv://…` | **Atlas** connection string. A local `mongod` will not work — see below. |
| `DATABASE_NAME` | yes | `agentic_predictive_maintenance` | Target database |
| `CHAT_PROVIDER` | yes | `bedrock` \| `grove` | Completion provider |
| `COMPLETION_MODEL` | yes | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Model ID valid **for the selected provider** |
| `EMBEDDING_PROVIDER` | yes | `voyage` \| `bedrock` | Embedding provider |
| `EMBEDDING_MODEL` | yes | `voyage-4` | Embedding model |
| `EMBEDDING_DIMENSIONS` | yes | `1024` | Must match the embedding model's output |
| `GROVE_API_KEY` | if `grove` | — | Grove gateway key |
| `VOYAGE_API_KEY` | if `voyage` | — | Voyage AI key |
| `AWS_REGION` | if `bedrock` | `us-east-1` | Bedrock region |
| `AWS_PROFILE` | optional | `default` | Omit to use the default AWS credential chain |

Constraints worth knowing before you debug a failure:

- **Atlas is required, not optional.** Seeding calls `createVectorSearchIndex`,
  which only exists on Atlas. Against a local server the documents insert and
  then index creation fails.
- **`npm run seed` only runs against an empty database.** It exits with code 1 if
  any collection contains documents. Use `npm run embed` and
  `npm run generate_calendar` for incremental updates.
- **`npm run generate_calendar` is destructive** — it clears
  `production_calendar` before regenerating.
- **`COMPLETION_MODEL` is provider-specific.** With `CHAT_PROVIDER=grove`, the
  gateway serves Claude models only over `/responses`, while
  [src/integrations/grove/chat.js](./src/integrations/grove/chat.js) uses
  `ChatOpenAI` against `/chat/completions`. Only GPT-family model names
  (for example `gpt-4.1`) work there today; a Bedrock-style ID such as
  `us.anthropic.claude-…` returns `404 api_not_supported`.

## MongoDB Skills

Use the official MongoDB agent skills from https://github.com/mongodb/agent-skills
whenever the task is MongoDB-specific and a matching skill exists.

## When To Use EDD.md

Use [EDD.md](./EDD.md) as the source of truth for the MongoDB data model in this repository.

Consult [EDD.md](./EDD.md) before making changes that touch:

- MongoDB collections, document structure, or field names
- API routes that read or write database records
- Validation, form fields, API payloads, or UI that depend on persisted data
- Schema documentation, Mermaid diagrams, or entity modeling discussions
