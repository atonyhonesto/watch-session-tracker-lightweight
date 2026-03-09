//The HTTP layer, Acts as the controller, sits between the client and store/validation logic
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { WatchSessionStore } from './store';
import { validateViewerEvent } from './validation';

//Helper Function Read the raw body from HTTP and turn it into a JS object
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw === '') {
    return {};
  }

  return JSON.parse(raw);
}

//Helper Function Standardize JSON responses
function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json)
  });
  res.end(json);
}

//Returns the actual HTTP req handler used by the server
export function createRequestHandler(store = new WatchSessionStore()) {
  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;

    //Verify the service is alive and able to respond
    if (method === 'GET' && path === '/health') {
      return sendJson(res, 200, { status: 'ok' });
    }

    //Accept even data from a client and attempts to process it
    if (method === 'POST' && path === '/events') {
      try {
        const body = await readJsonBody(req);
        const validation = validateViewerEvent(body);

        //JSON parse error
        if (!validation.ok) {
          return sendJson(res, 400, {
            message: 'Invalid event payload.',
            issues: validation.issues
          });
        }

        const result = store.ingest(validation.value);
        return sendJson(res, result.accepted ? 202 : 200, {
          accepted: result.accepted,
          reason: result.reason,
          sessionId: result.session.sessionId,
          state: result.session.currentState,
          eventCount: result.session.eventCount
        });
      } catch (error) {
        if (error instanceof SyntaxError) {
          return sendJson(res, 400, {
            message: 'Invalid JSON body.',
            issues: ['Request body could not be parsed as JSON.']
          });
        }

        //Something went wrong
        return sendJson(res, 500, {
          message: 'Unexpected error while processing event.'
        });
      }
    }

    //Extract and return eventId, activeSessionCount and activeWindowSeconds
    const activeMatch = path.match(/^\/events\/([^/]+)\/active-sessions$/);
    if (method === 'GET' && activeMatch) {
      const eventId = decodeURIComponent(activeMatch[1]);
      return sendJson(res, 200, {
        eventId,
        activeSessionCount: store.getActiveSessionCount(eventId),
        activeWindowSeconds: 45
      });
    }

    //Extract the specific details
    const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
    if (method === 'GET' && sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1]);
      const session = store.getSession(sessionId);

      //Session not found 404
      if (!session) {
        return sendJson(res, 404, { message: 'Session not found.' });
      }

      return sendJson(res, 200, {
        sessionId: session.sessionId,
        userId: session.userId,
        eventId: session.streamEventId,
        state: session.currentState,
        startedAt: session.startedAt,
        lastEventTimestamp: session.lastEventTimestamp,
        lastReceivedAt: session.lastReceivedAt,
        endedAt: session.endedAt ?? null,
        durationSoFarSeconds: session.durationSoFarSeconds,
        currentQuality: session.currentQuality ?? null,
        lastKnownPosition: session.lastKnownPosition ?? null,
        eventsReceived: session.eventsReceived
      });
    }

    //Route not found 404
    return sendJson(res, 404, { message: 'Route not found.' });
  };
}
