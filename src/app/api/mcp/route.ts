import { MCP_TOOLS, executeMcpTool } from '@/lib/mcpTools';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
};

// Global in-memory event stream subscribers for SSE
type SSESubscriber = (event: string, data: any) => void;
const sseSubscribers = new Map<string, SSESubscriber>();

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId') || `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send the endpoint event as per MCP SSE spec
      const endpointUri = `/api/mcp?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUri}\n\n`));

      const subscriber: SSESubscriber = (event, data) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might have closed
        }
      };

      sseSubscribers.set(sessionId, subscriber);

      // Keep connection alive with periodic comments
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        sseSubscribers.delete(sessionId);
      });
    },
    cancel() {
      sseSubscribers.delete(sessionId);
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const body = await req.json();

    const { id, method, params } = body || {};

    let responseData: any = null;

    if (method === 'initialize') {
      responseData = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'solv-budget-tracker-remote',
            version: '1.0.0'
          }
        }
      };
    } else if (method === 'notifications/initialized') {
      responseData = { jsonrpc: '2.0' };
    } else if (method === 'ping') {
      responseData = { jsonrpc: '2.0', id, result: {} };
    } else if (method === 'tools/list') {
      responseData = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS
        }
      };
    } else if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const outputText = await executeMcpTool(toolName, toolArgs);

      responseData = {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: outputText
            }
          ]
        }
      };
    } else {
      responseData = {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method "${method}" not found`
        }
      };
    }

    // If an active SSE subscriber exists for this session, also send over SSE
    if (sessionId && sseSubscribers.has(sessionId)) {
      const subscriber = sseSubscribers.get(sessionId);
      if (subscriber) {
        subscriber('message', responseData);
      }
    }

    // Always respond directly with the JSON-RPC response for HTTP/Stateless clients
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: err.message || 'Internal error'
        }
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
