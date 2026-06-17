import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    // Get session token from cookies only
    let sessionToken: string | null = null

    const cookieHeader = request.headers.get('cookie') || ''
    const cookies: Record<string, string> = {}
    cookieHeader.split(';').forEach(c => {
      const [key, ...val] = c.trim().split('=')
      if (key) cookies[key] = val.join('=')
    })

    sessionToken = cookies['session-token'] || null

    // Удалить сессию из базы данных
    if (sessionToken) {
      await db.session.deleteMany({ where: { token: sessionToken } }).catch(() => {})
    }

    const isProduction = process.env.NODE_ENV === 'production'

    const response = NextResponse.json({ ok: true })

    // Удалить все session cookies
    response.cookies.set({
      name: 'session-token',
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('[Auth Logout] Error:', error)
    return NextResponse.json({ ok: true }) // Всё равно возвращаем OK
  }
}
