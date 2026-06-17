import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// /api/auth/me — проверка текущей сессии
// Читает session token из httpOnly cookie
// Ищет сессию в базе данных — без зависимости от NextAuth JWT

// Track last cleanup time to avoid running cleanup on every request
let lastCleanupTime = 0
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // Run cleanup at most once per hour

async function cleanupExpiredSessions() {
  const now = Date.now()
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return
  }
  lastCleanupTime = now

  try {
    // Delete sessions that expired more than 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = await db.session.deleteMany({
      where: {
        expiresAt: { lt: cutoff },
      },
    })
    if (result.count > 0) {
      console.log(`[Auth Me] Cleaned up ${result.count} expired sessions older than 24h`)
    }
  } catch (error) {
    console.error('[Auth Me] Session cleanup error:', error)
  }
}

export async function GET(request: Request) {
  try {
    // Run expired session cleanup (throttled)
    await cleanupExpiredSessions()

    let sessionToken: string | null = null

    // Read session token from cookies only
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies: Record<string, string> = {}
    cookieHeader.split(';').forEach(c => {
      const [key, ...val] = c.trim().split('=')
      if (key) cookies[key] = val.join('=')
    })

    sessionToken = cookies['session-token'] || null

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    // Найти сессию в базе данных
    const session = await db.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    })

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    // Проверить срок действия
    if (session.expiresAt < new Date()) {
      // Сессия истекла — удалить из базы
      await db.session.delete({ where: { id: session.id } })
      return NextResponse.json({ authenticated: false, user: null })
    }

    // Проверить что пользователь активен
    if (!session.user.isActive) {
      await db.session.delete({ where: { id: session.id } })
      return NextResponse.json({ authenticated: false, user: null })
    }
    if (!session.user.isApproved) {
      await db.session.delete({ where: { id: session.id } })
      return NextResponse.json({ authenticated: false, user: null })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        department: session.user.department,
      },
    })
  } catch (error) {
    console.error('[Auth Me] Error:', error)
    return NextResponse.json({ authenticated: false, user: null })
  }
}
