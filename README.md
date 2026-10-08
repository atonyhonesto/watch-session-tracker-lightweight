# Watch Session Tracker: Lightweight Build

[![tests](https://github.com/atonyhonesto/watch-session-tracker-lightweight/actions/workflows/tests.yml/badge.svg)](https://github.com/atonyhonesto/watch-session-tracker-lightweight/actions/workflows/tests.yml) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white) ![dependencies](https://img.shields.io/badge/runtime_dependencies-0-2ea44f)

A real-time watch-session service for live sports streams in TypeScript and Node.js, with **no runtime dependencies**: Node's built-in `http` module, a hand-written validator and an in-memory store. See [`Stakeholder Concerns README.md`](Stakeholder%20Concerns%20README.md) for how it balances real-time counts, event loss and simplicity.

Companion code for my LinkedIn article **[Three Stakeholders, One Proof of Concept: Building a Real-Time Watch Session Tracker](https://www.linkedin.com/pulse/three-stakeholders-one-proof-concept-tony-honesto-rvkqc/)**. The article covers the design trade-offs: a 45-second activity window against a 10–15 second target, event-ID deduplication, two clocks, and why it was built twice.

| Repo | What it is |
|---|---|
| **[Lightweight build](https://github.com/atonyhonesto/watch-session-tracker-lightweight)** ← you are here | Node `http`, no runtime dependencies |
| [Common-libraries build](https://github.com/atonyhonesto/watch-session-tracker-express-zod) | Express, Zod, Supertest |
| [Event simulator](https://github.com/atonyhonesto/watch-session-event-simulator) | PowerShell, a simulated two-minute wrestling match |

---

A stripped-down TypeScript + Node.js proof of concept for the watch-session service.

Uses:

- Node's built-in `http` module
- a small manual validation helper
- in-memory session store and near-real-time counting logic

The goal is to make the PoC feel lighter, and closer to the minimum needed to demonstrate the session-tracking design.

## API surface

### `POST /events`
Accepts viewer events such as:

- `start`
- `heartbeat`
- `pause`
- `resume`
- `seek`
- `quality_change`
- `buffer_start`
- `buffer_end`
- `end`

### `GET /events/:eventId/active-sessions`
Returns the current active session count for a stream event.

### `GET /sessions/:sessionId`
Returns session details including:

- duration so far
- current state
- events received

## Run the service

```bash
npm install
npm start
```

## Run tests

```bash
npm test
```

## Example request

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123",
    "userId": "user-456",
    "eventType": "heartbeat",
    "eventId": "evt-789",
    "eventTimestamp": "2026-02-10T19:32:15.123Z",
    "receivedAt": "2026-02-10T19:32:15.450Z",
    "payload": {
      "eventId": "event-2026-wrestling-finals",
      "position": 1832.5,
      "quality": "1080p"
    }
  }'
```

## Example query responses

### Active sessions

```json
{
  "eventId": "event-2026-wrestling-finals",
  "activeSessionCount": 1,
  "activeWindowSeconds": 45
}
```

### Session details

```json
{
  "sessionId": "abc-123",
  "userId": "user-456",
  "eventId": "event-2026-wrestling-finals",
  "state": "active",
  "startedAt": "2026-02-10T19:32:15.123Z",
  "lastEventTimestamp": "2026-02-10T19:32:45.123Z",
  "lastReceivedAt": "2026-02-10T19:32:45.200Z",
  "endedAt": null,
  "durationSoFarSeconds": 30,
  "currentQuality": "1080p",
  "lastKnownPosition": 30,
  "eventsReceived": []
}
```

## What I chose to test

I focused the tests on the behavior most important to the prompt:

- accepting valid ingestion payloads
- rejecting invalid payloads
- deduplicating duplicate event IDs
- computing near-real-time active session counts
- returning useful session detail snapshots

## Assumptions

- The `payload.eventId` identifies the sporting event or stream being watched.
- A session is considered active if it is not ended and an event was received within the last 45 seconds.
- Session duration is measured from the first event timestamp to the latest event timestamp, or the `end` event if present.
- `receivedAt` is used for activity freshness because it reflects when the service actually saw the event.
