import { NextRequest, NextResponse } from "next/server";

// required export name for Next.js middleware
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };