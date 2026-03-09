//Startup bootstrap layer of app, Create the HTTP Server, which  port and the req hadler
import { createServer } from 'http';
import { createRequestHandler } from './app';

const port = Number(process.env.PORT ?? 3000);
const server = createServer(createRequestHandler());

//Start the server
server.listen(port, () => {
  console.log(`Watch Session Tracker lightweight PoC listening on port ${port}`);
});
