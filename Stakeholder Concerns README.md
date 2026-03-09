# Watch Session Tracker -- Lightweight PoC

# Does the PoC address the stakeholder concerns?

This lightweight implementation intentionally prioritizes **engineering
simplicity** while still demonstrating the key product capability.

Below is how the PoC aligns with each stakeholder concern.

------------------------------------------------------------------------

## Product: "close to real‑time" viewer counts

**Status: Mostly addressed for a PoC**

The service provides near‑real‑time session counting by:

-   Accepting events immediately through the REST API
-   Updating session state in memory
-   Computing active viewer counts directly from current state
-   Using a configurable freshness window to determine active sessions

Because the service processes events synchronously and keeps state in
memory, viewer counts can be queried immediately.

However, the implementation uses a **45‑second activity window**, which
means the result is **near‑real‑time** rather than strictly within the
10‑15 second target mentioned in the planning discussion.

For a PoC, this demonstrates the capability clearly without introducing
additional system complexity.

------------------------------------------------------------------------

## Operations: "do not lose events"

**Status: Not fully addressed (intentionally)**

This version does not provide durable event storage.

Current behavior:

-   Events are processed synchronously
-   Duplicate events are detected using event IDs
-   Session state exists only in memory

This means that events could be lost in cases such as:

-   Process restart
-   Deployment restart
-   Traffic spikes exceeding process capacity

For a production implementation, the service would likely include:

-   Durable ingestion queue (Kafka / Kinesis / PubSub)
-   Persistent event storage
-   Replay capability
-   Backpressure and retry mechanisms

These were intentionally excluded to keep the PoC simple and focused.

------------------------------------------------------------------------

## Engineering: "keep the system simple"

**Status: Strongly addressed**

The lightweight version intentionally minimizes dependencies and moving
parts.

Key simplicity choices:

-   Built using **Node.js + TypeScript**
-   Uses Node's built‑in **http server**
-   No external frameworks required
-   Manual validation instead of validation libraries
-   In‑memory state instead of database storage

These decisions make the system:

-   easy to reason about
-   easy to debug
-   easy to evolve into a production architecture

------------------------------------------------------------------------

# Known limitations

This implementation is intentionally **not production ready**.

Because state is stored in memory:

-   restarting the service clears all sessions
-   there is no replay mechanism
-   events are not stored durably
-   horizontal scaling would require shared state

These limitations are acceptable for a **proof of concept** whose
goal is to demonstrate service behavior and architectural thinking.

