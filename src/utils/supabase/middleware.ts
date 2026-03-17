// src/utils/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Memperbaharui sesi auth jika ia tamat tempoh (Sangat penting!)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // LOGIK PROTEKSI HALAMAN (PENTING):
  // Jika user belum login dan cuba buka halaman dashboard (selain login page)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Jika user sudah login dan cuba buka halaman login semula, hantar ke dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/' // atau ke /dashboard jika anda ada rute tersebut
    return NextResponse.redirect(url)
  }

  if (user) {
    const pathname = request.nextUrl.pathname

    if (!pathname.startsWith('/auth')) {
      let role: string | null = null

      const { data: profiles } = await supabase.rpc('get_current_user_profile')
      if (profiles && profiles.length > 0) {
        role = profiles[0]?.role || null
      }

      if (!role) {
        const { data: fallbackProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        role = fallbackProfile?.role || null
      }

      if (role === 'other_user') {
        const isAllowedPath =
          pathname === '/' ||
          pathname.startsWith('/warehouse-layout') ||
          pathname.startsWith('/stock-list') ||
          pathname.startsWith('/api')

        if (!isAllowedPath) {
          const url = request.nextUrl.clone()
          url.pathname = '/warehouse-layout'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}