import { NextResponse } from "next/server";

const healthHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export function GET(): NextResponse<{ ok: true }> {
  return NextResponse.json({ ok: true }, { headers: healthHeaders });
}

export function HEAD(): Response {
  return new Response(null, {
    status: 200,
    headers: healthHeaders,
  });
}
