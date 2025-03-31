import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { GlobalThisWSS } from '$lib/server/webSocketUtils';
import type { ExtendedGlobal } from '$lib/server/webSocketUtils';
import console from 'console';
import net from "net"

// This can be extracted into a separate file
let wssInitialized = false;
const startupWebsocketServer = () => {
  if (wssInitialized) return;
  console.log('[wss:kit] setup');
  console.log(GlobalThisWSS)
  const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
  console.log("WSS: "+wss)
  if (wss !== undefined) {
    wss.on('connection', (ws:any, request:any) => {
        // This is where you can authenticate the client from the request
        // const session = await getSessionFromCookie(request.headers.cookie || '');
        // if (!session) ws.close(1008, 'User not authenticated');
        // ws.userId = session.userId;
        const requestUrl = new URL(request.url, `http://${request.headers.host}`);
        const pathname = requestUrl.pathname;
        let hasInitConnection:boolean = false
        console.log(`[wss:kit] client connected (${ws.socketId})`);
        if (pathname === "/websockify") {
            // Websockify behavior (integrated from new_client)
            let target:any = null
    
            ws.on('message', async function (msg: any) {
              // Handle the first message to establish the connection
              if (!hasInitConnection) {
                console.log(`[websockify] Received message: ${msg}`);
            
                // Check if the message is a valid JSON
                try {
                  const parsedMsg = JSON.parse(msg);  // Try to parse the message
                  if (parsedMsg.type === "targetSetter") {
                    // Use async-await when calling the initTarget function
                    await initTarget(parsedMsg.host, parsedMsg.port);  // Establish the target connection
                    return;
                  }
                } catch (error) {
                  console.log('[websockify] Message is not valid JSON:', msg);
                }
              }
            
              // Once connection is initialized, forward messages to the target
              if (hasInitConnection && target != null) {
                // console.log(`[websockify] Sending message to target: ${msg}`);
                target.write(msg); // Send the original message to the target
              }
            });
            
            ws.on('close', function (code: any, reason: any) {
              console.log(`[websockify] WebSocket client disconnected: ${code} [${reason}]`);
              if (hasInitConnection && target != null) {
                target.end();  // Clean up the target connection
              }
            });
            
            ws.on('error', function (err: any) {
              console.log(`[websockify] WebSocket client error: ${err.message}`);
              if (hasInitConnection && target != null) {
                target.end();  // Clean up the target connection
              }
            });
            
            // Function to initialize the connection to the target
            async function initTarget(host: string, port: number) {
              return new Promise<void>((resolve, reject) => {
                // Create the target connection
                target = net.createConnection(port, host, function () {
                  console.log(`[websockify] Connected to target at ${host}:${port}`);
                  hasInitConnection = true;  // Set flag to true once the connection is established
                  resolve();  // Resolve the promise when the connection is established
                });
            
                // Handle data coming from the target
                target.on('data', function (data: any) {
                  try {
                    // console.log(`[websockify] Received message to websocket: ${data}`);
                    ws.send(data);  // Forward data from target to WebSocket client
                  } catch (e) {
                    console.log("[websockify] Client closed, cleaning up target");
                    target.end();  // Close target connection
                  }
                });
            
                // Handle end of target connection
                target.on('end', function () {
                  console.log('[websockify] Target disconnected');
                  ws.close();  // Close WebSocket connection
                });
            
                // Handle error on target connection
                target.on('error', function () {
                  console.log('[websockify] Target connection error');
                  target.end();  // Close target connection
                  ws.close();  // Close WebSocket connection
                  reject(new Error('Target connection error'));  // Reject the promise on error
                });
              });
            }            
            
        } else {
            // Default behavior for other WebSocket connections
            ws.send(JSON.stringify(`Hello from SvelteKit ${new Date().toLocaleString()} (${ws.socketId})]`));

            ws.on('message', async (message: any) => {
                // Handle messages for non-websockify connections
            });

            ws.on('error', (err: any) => {
                console.error(`WebSocket error: ${err.message}`);
            });

            ws.on('close', () => {
                console.log(`[wss:kit] client disconnected (${ws.socketId})`);
            });
        }
    });
    wss.broadcast = function(data:any, socketId:any) {
        wss.clients.forEach((client:any) => {
            if(client.socketId != socketId || socketId == -1) client.send(data)
        });
      };
    wssInitialized = true;
    console.log("wss initialized: "+wssInitialized)
  }
};

export const handle = (async ({ event, resolve }) => {
    const { request, url } = event;
    const currentUrl = new URL(request.url);
    const rootPath = currentUrl.origin;
    startupWebsocketServer();
    // Skip WebSocket server when pre-rendering pages
    if (event.route.id?.startsWith("/login")) {
        return new Response(null, {
            status: 302,
            headers: { Location: `${rootPath}/` }
        });
    }
    if (!building) {
        const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
        if (wss !== undefined) {
        event.locals.wss = wss;
        }
    }
    const response = await resolve(event, {
            filterSerializedResponseHeaders: name => name === 'content-type',
        });
    return response;
}) satisfies Handle;