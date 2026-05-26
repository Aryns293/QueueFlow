# QueueFlow

A distributed job queue system built from scratch using raw Redis commands —
no BullMQ, no abstractions. Implements producer-consumer pattern, exponential
backoff retry logic, and dead-letter queue with a real-time monitoring dashboard.

🔴 Live Demo → []

---

## What This Project Demonstrates

Most developers use queues as black boxes. This project implements one from
scratch to understand exactly what happens under the hood — the same concepts
used by Swiggy (order confirmations), Razorpay (payment retries), and Uber
(dispatch jobs).

---

## Architecture
```
Client
│
│  POST /jobs
▼
Express API ──── INSERT ────► PostgreSQL
│                           (job status tracking)
│  LPUSH
▼
Redis LIST (jobQueue)
│
│  BRPOP (blocking)
▼
Worker Process
│
├── SUCCESS → status = 'completed'
│
└── FAILURE → retry_count < max_retries?
│
├── YES → retry_count++, LPUSH back
│         (exponential backoff)
│
└── NO  → status = 'failed'
          (dead-letter)
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Queue Broker | Redis (raw LIST) | LPUSH O(1), BRPOP blocks until job available — no polling |
| Backend | Node.js + Express | Async I/O matches queue workload perfectly |
| Database | PostgreSQL | Persistent job state, survives worker crashes |
| Frontend | React + Vite | Real-time dashboard, polls every 3s |
| Deploy | Railway + Vercel + Neon + Redis Cloud | Free tier, production-grade |

---

## Core Redis Commands

Only two Redis commands power the entire queue:

```bash
LPUSH jobQueue '{"id":"abc","type":"email"}'
# Producer pushes job to LEFT of list — O(1)

BRPOP jobQueue 0
# Worker blocks here until job arrives, pops from RIGHT
# 0 = wait forever. No polling. No CPU waste.
```

This is FIFO. First job in, first job out. Dead simple, battle-tested.

---

## Features

**Producer**
- `POST /jobs` — create any job type with arbitrary payload
- Jobs immediately persisted to PostgreSQL before Redis push
- If Redis push fails, job is not lost (DB has it)

**Worker**
- Blocking pop — zero CPU usage while waiting
- Processes one job at a time (single worker process)
- Marks job `processing` before starting, prevents duplicate processing

**Retry Logic**
- Automatic retry on failure — up to 3 attempts
- Exponential backoff — 2s, 4s, 8s between retries
- Retry count visible on dashboard

**Dead Letter Queue**
- Jobs exhausting all retries → status = `failed`
- Error message stored in PostgreSQL
- Visible on dashboard — never silently lost

**Dashboard**
- Real-time job monitoring (auto-refreshes every 3s)
- Filter by status: queued / processing / completed / failed
- Create jobs manually from UI
- Shows retry count and error message per job

**Simulation Script**
- Fires 50 concurrent jobs of random types
- Worker processes with 85% random failure rate to demonstrate retry logic

---

## API Endpoints

```
POST /jobs          Create a new job
GET  /jobs          Get all jobs (dashboard)
GET  /jobs/:id      Get single job by ID
```

**Create job:**
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "payload": {"to": "user@example.com"}}'
```

**Response:**
```json
{ "success": true, "jobId": "uuid-here" }
```

---

## Job Lifecycle

```
queued → processing → completed
                ↘
              failed (after 3 retries)
```

```sql
-- PostgreSQL tracks every state transition
id          UUID PRIMARY KEY
type        VARCHAR   -- email | sms | image-resize | pdf-generate
payload     JSONB     -- arbitrary data
status      VARCHAR   -- queued | processing | completed | failed
retry_count INTEGER   -- 0 to max_retries
max_retries INTEGER   -- default 3
error       TEXT      -- last failure message
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

---

## Local Setup

**Prerequisites:** Node.js 18+, Redis, PostgreSQL

```bash
# 1. Clone
git clone https://github.com/Aryns293/queueflow
cd queueflow/backend

# 2. Install
npm install

# 3. Environment
cp .env.example .env
# Fill in DATABASE_URL and REDIS_URL

# 4. Create jobs table
node migrate.js

# 5. Start Redis
redis-server

# 6. Start API (Terminal 1)
npm run dev

# 7. Start Worker (Terminal 2)
npm run worker:dev

# 8. Start Frontend (Terminal 3)
cd ../frontend && npm run dev

# 9. Fire test jobs (Terminal 4)
cd ../backend && npm run simulate
```

Open `http://localhost:5173` and watch jobs process in real time.

---

## Key Technical Decisions

**Why raw Redis instead of BullMQ?**

BullMQ abstracts away the underlying Redis operations. By using raw `LPUSH`
and `BRPOP`, every line of the queue logic is explicit and understandable.
This project is as much about learning how queues work as building one.

**Why BRPOP with timeout 0?**

`BRPOP` with timeout `0` blocks indefinitely until a job arrives. The
alternative — polling with `LPOP` in a loop — wastes CPU cycles constantly
checking an empty queue. Blocking pop means zero CPU usage while idle.

**Why PostgreSQL alongside Redis?**

Redis is ephemeral by default. If the Redis instance restarts, the queue
is gone. PostgreSQL provides durable job state — every job is persisted
before being pushed to Redis. If Redis crashes and jobs are lost, the DB
still has a record of every job and its last known status.

**Why LPUSH for retries? (Known Limitation)**

Currently retried jobs use `LPUSH` — same as new jobs. This means retried
jobs accumulate at the front of the queue but get processed last (since
`BRPOP` pops from the right). All failures appear in a batch at the end
instead of distributing naturally.

**Production fix:** Use Redis Sorted Set as a delayed retry queue.
Score = `Date.now() + backoffDelay`. A separate poller moves due jobs
back to the main queue using `ZRANGEBYSCORE` + atomic `ZPOPMIN`.
This distributes retries naturally across time.

---

## Deployment

| Service | Platform | Free Tier |
|---|---|---|
| API Server | Railway | ✅ |
| Worker Process | Railway | ✅ |
| PostgreSQL | Neon | ✅ |
| Redis | Redis Cloud | ✅ 30MB |
| Frontend | Vercel | ✅ |

---

## Future Improvements

- [ ] Redis Sorted Set for delayed retry queue
- [ ] Multiple worker processes (worker pool)
- [ ] Priority queues (high/normal/low)
- [ ] Metrics endpoint (throughput, p99 latency, retry rate)
- [ ] Job scheduling (cron-style delayed jobs)
- [ ] Webhook on job completion

---

## Author

Aryan Sharma
Delhi Technological University
