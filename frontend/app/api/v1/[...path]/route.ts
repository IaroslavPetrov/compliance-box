import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'https://compliance-box-backend.onrender.com/api/v1';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function proxy(req: NextRequest) {
  // Путь передаётся ТОЧНО как пришёл (со слэшем или без) — без редиректов
  const rel = req.nextUrl.pathname.replace(/^\/api\/v1/, '');
  const target = `${BACKEND}${rel}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const res = await fetch(target, init);
  const buf = await res.arrayBuffer();
  return new NextResponse(Buffer.from(buf), {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) { return proxy(req); }
export async function POST(req: NextRequest) { return proxy(req); }
export async function PUT(req: NextRequest) { return proxy(req); }
export async function PATCH(req: NextRequest) { return proxy(req); }
export async function DELETE(req: NextRequest) { return proxy(req); }