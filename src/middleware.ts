// src/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Padankan semua rute permintaan kecuali untuk yang bermula dengan:
     * - _next/static (fail statik)
     * - _next/image (imej Next.js)
     * - favicon.ico (fail favicon)
     * - fail imej (svg, png, jpg, dll)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}