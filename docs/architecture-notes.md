# Architecture Notes - Lightweight PoC

## Summary

This version prioritizes the smallest useful implementation.

## Request flow

1. Client sends an event to `POST /events`
2. A lightweight validation helper checks required fields and data types
3. The in-memory store updates the session snapshot
4. Query endpoints return the latest computed state

## Session state model

- `start`, `heartbeat`, `resume`, `seek`, `quality_change` => `active`
- `pause` => `paused`
- `buffer_start` => `buffering`
- `buffer_end` => `active`
- `end` => `ended`

## Active session logic

A session counts as active when:

- it belongs to the requested stream event
- it is not in the `ended` state
- the last `receivedAt` timestamp is within the last 45 seconds

## Trade-offs

### What this version does well

- Lowest dependency count
- Keeps focus on core session logic
- Fast to run locally

### What this version does not solve yet

- Durable storage during restarts
- Horizontal scaling across multiple instances
- Backpressure during large spikes
- Replay or recovery of missed events

## Production direction

For production, I would still move toward:

- a durable ingestion layer
- a shared low-latency state store
- stronger observability and metrics
- TTL-based cleanup for stale sessions
