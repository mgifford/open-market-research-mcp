/**
 * Stateless public MCP Worker. The source directory is imported directly from
 * the repository; never maintain a separate Worker copy of research sources.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';
import sources from '../../src/omr_mcp/sources.json' with { type: 'json' };
import {
  LIMITS, discoverSources, createPublicPlan, accessibilityChecklist,
  methodologyGuide, reportTemplate, serviceInfo,
} from './core.mjs';

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function toolResult(value) {
  return {
    structuredContent: value,
    content: [{ type: 'text', text: JSON.stringify(value) }],
  };
}

function createServer() {
  const server = new McpServer({
    name: 'open-market-research-public',
    version: '0.1.0',
  });

  server.registerTool('discover_research_sources', {
    title: 'Discover public market research starting points',
    description: 'List curated research sources and public links. No searches are performed and returned sources are not verified market findings.',
    inputSchema: z.object({
      query: z.string().max(LIMITS.sourceQuery).optional(),
      category: z.string().max(LIMITS.category).optional(),
      limit: z.number().int().min(1).max(LIMITS.limit).optional(),
    }),
    annotations,
  }, async (args) => toolResult(discoverSources(sources, args)));

  server.registerTool('create_public_research_plan', {
    title: 'Draft a public-information-only research plan',
    description: 'Generate neutral research questions, reference sources, and suggested searches. Requires an explicit public disclosure confirmation. This does not perform research. Never send CUI, procurement-sensitive, proprietary or private data.',
    inputSchema: z.object({
      publicNeed: z.string().min(10).max(LIMITS.publicNeed),
      acquisitionType: z.enum(['digital-service', 'software', 'professional-services', 'other']).optional(),
      context: z.string().max(LIMITS.label).optional(),
      confirmedPublic: z.literal(true),
    }),
    annotations,
  }, async (args) => toolResult(createPublicPlan(sources, args)));

  server.registerTool('accessibility_evidence_checklist', {
    title: 'Prepare Section 508 evidence questions',
    description: 'Provide GSA source links and a generic accessibility evidence checklist. Not an ACR import, compliance finding, or exception decision.',
    inputSchema: z.object({
      ictType: z.string().max(LIMITS.label).optional(),
      acrStatus: z.enum(['unknown', 'available', 'missing', 'outdated']).optional(),
    }),
    annotations,
  }, async (args) => toolResult(accessibilityChecklist(args)));

  server.registerTool('research_methodology', {
    title: 'Research evidence and provenance rules',
    description: 'Describe the evidence-backed research record and distinctions between suggestions, searches, supplier claims and independent evaluation.',
    inputSchema: z.object({}),
    annotations,
  }, async () => toolResult(methodologyGuide()));

  server.registerTool('report_outline', {
    title: 'Prepare a draft market research report outline',
    description: 'Return a source-aware report structure without writing unsourced findings or decisions.',
    inputSchema: z.object({}),
    annotations,
  }, async () => toolResult(reportTemplate()));

  return server;
}

// JSON-RPC over Streamable HTTP. No browser CORS exposure is needed for cloud AI clients.
const mcpHandler = createMcpHandler(createServer, {
  route: '/mcp',
  corsOptions: false,
  allowedOriginHostnames: '*',
  responseMode: 'auto',
});

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function exceedsBodyLimit(request, maxBytes) {
  const reader = request.clone().body?.getReader();
  if (!reader) return false;
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/' || path === '/healthz') {
      return jsonResponse({ status: env.PUBLIC_MCP_ENABLED === 'true' ? 'ready' : 'disabled', ...serviceInfo() });
    }
    if (path !== '/mcp') return jsonResponse({ error: 'not_found' }, 404);
    if (env.PUBLIC_MCP_ENABLED !== 'true') return jsonResponse({ error: 'service_disabled' }, 503);

    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > 65536) return jsonResponse({ error: 'request_too_large' }, 413);
    if (request.method === 'POST') {
      // Enforce a byte limit even when Content-Length is missing or incorrect.
      if (await exceedsBodyLimit(request, 65536)) return jsonResponse({ error: 'request_too_large' }, 413);
    }
    const response = await mcpHandler(request, env, ctx);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  },
};
