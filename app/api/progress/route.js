const MECCA = process.env.MECCA_API_URL || 'http://localhost:4181/api';

function auth(req) {
  const header = req.headers.get('authorization');
  return header ? { Authorization: header } : {};
}

export async function GET(req) {
  const show = new URL(req.url).searchParams.get('show');
  const url = show
    ? `${MECCA}/progress?show=${encodeURIComponent(show)}`
    : `${MECCA}/progress`;
  const res = await fetch(url, { headers: auth(req), cache: 'no-store' });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(req) {
  const body = await req.json();
  const res = await fetch(`${MECCA}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth(req) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
