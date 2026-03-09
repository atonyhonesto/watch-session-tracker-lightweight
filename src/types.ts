//Provides the shared TS definitions used by the API and the store
export const EVENT_TYPES = [
  'start',
  'heartbeat',
  'pause',
  'resume',
  'seek',
  'quality_change',
  'buffer_start',
  'buffer_end',
  'end'
] as const;

//TS type from the Event Types
export type ViewerEventType = (typeof EVENT_TYPES)[number];

//Describe the nested payload from inside the incoming viewer event
export interface ViewerEventPayload {
  eventId: string;
  position?: number;
  quality?: string;
}

//Full shape of an incoming event sent into the system
export interface ViewerEvent {
  sessionId: string;
  userId: string;
  eventType: ViewerEventType;
  eventId: string;
  eventTimestamp: string;
  receivedAt: string;
  payload: ViewerEventPayload;
}

//Restrict to 4 known known vals
export type SessionState = 'active' | 'paused' | 'buffering' | 'ended';

//THe shape of the stored session data after the events have been processed
export interface SessionRecord {
  sessionId: string;
  userId: string;
  streamEventId: string;
  currentState: SessionState;
  startedAt: string;
  lastEventTimestamp: string;
  lastReceivedAt: string;
  lastKnownPosition?: number;
  currentQuality?: string;
  endedAt?: string;
  eventCount: number;
  durationSoFarSeconds: number;
  eventsReceived: ViewerEvent[];
}
