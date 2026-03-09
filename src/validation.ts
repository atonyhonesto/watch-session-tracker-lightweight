//Input validation layer, Checks if incoming data is shaped correctly before trying to process it
import { EVENT_TYPES, ViewerEvent } from './types';

//Check is this or that
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

//Check the value is string and is date
function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

//
export function validateViewerEvent(input: unknown):
  | { ok: true; value: ViewerEvent }
  | { ok: false; issues: string[] } {
  const issues: string[] = [];
  //Create the issues array above

  //Step 2 IS top level and obj
  if (!isObject(input)) {
    return { ok: false, issues: ['Body must be a JSON object.'] };
  }

  const sessionId = input.sessionId;
  const userId = input.userId;
  const eventType = input.eventType;
  const eventId = input.eventId;
  const eventTimestamp = input.eventTimestamp;
  const receivedAt = input.receivedAt;
  const payload = input.payload;

  //Step 3 Extract the data and Step 4 validate the top level fields
  if (typeof sessionId !== 'string' || sessionId.trim() === '') issues.push('sessionId is required.');
  if (typeof userId !== 'string' || userId.trim() === '') issues.push('userId is required.');
  if (typeof eventId !== 'string' || eventId.trim() === '') issues.push('eventId is required.');
  if (typeof eventType !== 'string' || !EVENT_TYPES.includes(eventType as (typeof EVENT_TYPES)[number])) {
    issues.push(`eventType must be one of: ${EVENT_TYPES.join(', ')}.`);
  }
  if (!isIsoDate(eventTimestamp)) issues.push('eventTimestamp must be a valid ISO timestamp.');
  if (!isIsoDate(receivedAt)) issues.push('receivedAt must be a valid ISO timestamp.');
  //Step 5 Validate the payload
  if (!isObject(payload)) {
    issues.push('payload is required.');
  } else {
    if (typeof payload.eventId !== 'string' || payload.eventId.trim() === '') {
      issues.push('payload.eventId is required.');
    }
    if (payload.position !== undefined && (typeof payload.position !== 'number' || payload.position < 0)) {
      issues.push('payload.position must be a non-negative number when provided.');
    }
    if (payload.quality !== undefined && (typeof payload.quality !== 'string' || payload.quality.trim() === '')) {
      issues.push('payload.quality must be a non-empty string when provided.');
    }
  }

  //Should I fail
  if (issues.length > 0 || !isObject(payload)) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      sessionId,
      userId,
      eventType: eventType as ViewerEvent['eventType'],
      eventId,
      eventTimestamp,
      receivedAt,
      payload: {
        eventId: payload.eventId as string,
        position: payload.position as number | undefined,
        quality: payload.quality as string | undefined
      }
    }
  };
}
