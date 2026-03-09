//In mem session store, manage all the session state and calcs
import { SessionRecord, SessionState, ViewerEvent } from './types';

const ACTIVE_WINDOW_MS = 45_000;
const TERMINAL_STATES = new Set<SessionState>(['ended']);

//Convert ISO timestamp strings into milliseconds timestamps
function toMs(iso: string): number {
  return new Date(iso).getTime();
}

//Set the session state after receiving a particular event
function deriveState(eventType: ViewerEvent['eventType'], previousState: SessionState): SessionState {
  switch (eventType) {
    case 'start':
    case 'heartbeat':
    case 'resume':
    case 'seek':
    case 'quality_change':
      return 'active';
    case 'pause':
      return 'paused';
    case 'buffer_start':
      return 'buffering';
    case 'buffer_end':
      return 'active';
    case 'end':
      return 'ended';
    default:
      return previousState;
  }
}

//Maintains all active session data, Two internal structures are used
export class WatchSessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly seenEventIds = new Set<string>();

  //Get the event and update the session
  ingest(event: ViewerEvent): { accepted: boolean; reason?: string; session: SessionRecord } {
    if (this.seenEventIds.has(event.eventId)) {
      const existing = this.sessions.get(event.sessionId);
      if (!existing) {
        throw new Error('Duplicate event referenced a missing session.');
      }
      return { accepted: false, reason: 'duplicate_event_id', session: existing };
    }

    //Compute the Session fields
    const existing = this.sessions.get(event.sessionId);
    const startedAt = existing?.startedAt ?? event.eventTimestamp;
    const endedAt = event.eventType === 'end' ? event.eventTimestamp : existing?.endedAt;
    const lastKnownPosition = event.payload.position ?? existing?.lastKnownPosition;
    const currentQuality = event.payload.quality ?? existing?.currentQuality;
    const currentState = deriveState(event.eventType, existing?.currentState ?? 'active');
    const durationEnd = endedAt ?? event.eventTimestamp;
    const durationSoFarSeconds = Math.max(0, Math.floor((toMs(durationEnd) - toMs(startedAt)) / 1000));

    //Build new session object with the updated session info
    const next: SessionRecord = {
      sessionId: event.sessionId,
      userId: event.userId,
      streamEventId: event.payload.eventId,
      currentState,
      startedAt,
      lastEventTimestamp: event.eventTimestamp,
      lastReceivedAt: event.receivedAt,
      lastKnownPosition,
      currentQuality,
      endedAt,
      eventCount: (existing?.eventCount ?? 0) + 1,
      durationSoFarSeconds,
      eventsReceived: [...(existing?.eventsReceived ?? []), event]
    };

    //Store the updated session
    this.sessions.set(event.sessionId, next);
    this.seenEventIds.add(event.eventId);

    return { accepted: true, session: next };
  }

  //Get the session via ID
  getSession(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  //Calc how many sessions are active for specific stream
  getActiveSessionCount(streamEventId: string, now = new Date()): number {
    const nowMs = now.getTime();

    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.streamEventId !== streamEventId) continue;
      if (TERMINAL_STATES.has(session.currentState)) continue;
      if (nowMs - toMs(session.lastReceivedAt) > ACTIVE_WINDOW_MS) continue;
      count += 1;
    }
    return count;
  }

  //Clear the store
  reset(): void {
    this.sessions.clear();
    this.seenEventIds.clear();
  }
}
