import { AddressInfo } from 'net';
import { createServer, Server } from 'http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequestHandler } from '../src/app';
import { WatchSessionStore } from '../src/store';

const baseEvent = {
  sessionId: 'abc-123',
  userId: 'user-456',
  eventType: 'start',
  eventId: 'evt-001',
  eventTimestamp: '2026-02-10T19:32:15.123Z',
  receivedAt: '2026-02-10T19:32:15.450Z',
  payload: {
    eventId: 'event-2026-wrestling-finals',
    position: 0,
    quality: '1080p'
  }
};

describe('Watch session tracker lightweight API', () => {
  let store: WatchSessionStore;
  let server: Server;
  let baseUrl: string;

  //Prepares a fresh environment before each test runs
  beforeEach(async () => {
    store = new WatchSessionStore();
    server = createServer(createRequestHandler(store));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    vi.useRealTimers();
  });

  //No test leaves behind state
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    store.reset();
    vi.useRealTimers();
  });

  //First verify the api accepts a valid watch event
  it('accepts an incoming event', async () => {
    const response = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseEvent)
    });
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      accepted: true,
      sessionId: 'abc-123',
      state: 'active',
      eventCount: 1
    });
  });

  //Second check that the system handles dup events correctly+
  it('deduplicates duplicate event IDs', async () => {
    await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseEvent)
    });

    const duplicate = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseEvent)
    });
    const body = await duplicate.json();

    expect(duplicate.status).toBe(200);
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe('duplicate_event_id');
  });

  //Third verify the api can calc how many sessions are active watching an event
  it('returns active session count close to real time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T19:32:20.000Z'));

    await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseEvent)
    });

    const countResponse = await fetch(`${baseUrl}/events/event-2026-wrestling-finals/active-sessions`);
    const countBody = await countResponse.json();
    expect(countResponse.status).toBe(200);
    expect(countBody.activeSessionCount).toBe(1);

    vi.setSystemTime(new Date('2026-02-10T19:33:10.000Z'));

    const expired = await fetch(`${baseUrl}/events/event-2026-wrestling-finals/active-sessions`);
    const expiredBody = await expired.json();
    expect(expiredBody.activeSessionCount).toBe(0);
  });

  //Verify the api returns info about a specific session
  it('returns session details with duration and events received', async () => {
    await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseEvent)
    });

    await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseEvent,
        eventType: 'heartbeat',
        eventId: 'evt-002',
        eventTimestamp: '2026-02-10T19:32:45.123Z',
        receivedAt: '2026-02-10T19:32:45.200Z',
        payload: {
          ...baseEvent.payload,
          position: 30
        }
      })
    });

    const response = await fetch(`${baseUrl}/sessions/abc-123`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.durationSoFarSeconds).toBe(30);
    expect(body.eventsReceived).toHaveLength(2);
    expect(body.lastKnownPosition).toBe(30);
  });

  //Final verify input, bad payload should reject and give 400
  it('validates malformed payloads', async () => {
    const response = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Invalid event payload.');
    expect(body.issues.length).toBeGreaterThan(0);
  });
});
