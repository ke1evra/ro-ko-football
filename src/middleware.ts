import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  // Server Actions carry the action id in this header.
  // If we ever see repeated "Failed to find Server Action" in logs, this helps identify
  // whether it's stale tabs, proxy caching, or bots sending old action ids.
  const nextAction = request.headers.get('next-action')
  if (nextAction) {
    console.warn('[SERVER ACTION REQUEST]', {
      url: request.url,
      method: request.method,
      nextAction,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
    })
  }

  // Check if the route is protected and user is not authenticated
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) && !token) {
    // Store the original URL to redirect back after login
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()

  // Prevent intermediary caches from serving stale RSC/Server Action responses across deploys.
  // (If some CDN/proxy cached HTML/RSC, users will keep sending old action ids and this error repeats.)
  if (nextAction) {
    res.headers.set('Cache-Control', 'no-store')
  }

  return res
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: ['/:path*'],
}
