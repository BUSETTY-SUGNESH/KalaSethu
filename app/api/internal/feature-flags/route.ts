import { NextResponse, type NextRequest } from 'next/server';
import { getFeatureFlagsServer } from '@/lib/services/server/feature-flags.service';

export const runtime = 'nodejs';

function isAuthorizedInternalRequest(request: NextRequest): boolean {
  const secret = process.env.MIDDLEWARE_SECRET;
  if (!secret) return false;
  return request.headers.get('x-middleware-secret') === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const flags = await getFeatureFlagsServer();
  return NextResponse.json(flags, {
    headers: {
      'Cache-Control': 'private, max-age=30',
    },
  });
}
