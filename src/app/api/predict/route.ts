import { NextRequest, NextResponse } from 'next/server';

// Proxies prediction requests to the Python model server
// Configure with env var PREDICT_URL or defaults to localhost:5001
const BACKEND_URL = process.env.PREDICT_URL || 'http://127.0.0.1:5001/predict';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || (!body.image && !body.landmarks)) {
      return NextResponse.json({ error: 'Missing image or landmarks in request body' }, { status: 400 });
    }

    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Upstream error', status: res.status, message: text?.slice(0, 1000) },
        { status: 502 }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Non-JSON from model server', message: text?.slice(0, 1000) },
        { status: 502 }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Predict route failed', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
