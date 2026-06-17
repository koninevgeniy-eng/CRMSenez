import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // RATE LIMITING: Max 5 login attempts per minute per IP
    const clientIp = getClientIp(request)
    const rateResult = rateLimit(`login:${clientIp}`, 5, 60 * 1000)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Слишком много попыток входа. Попробуйте позже.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Найти пользователя
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user || !user.isActive) {
      console.log('[Auth Login] User not found or inactive:', email)
      return NextResponse.json(
        { ok: false, error: 'CredentialsSignin' },
        { status: 401 }
      )
    }

    // Проверка одобрения аккаунта администратором
    if (!user.isApproved) {
      console.log('[Auth Login] User not approved:', email)
      return NextResponse.json(
        { ok: false, error: 'AccountPendingApproval', message: 'Ваш аккаунт ожидает одобрения администратором' },
        { status: 403 }
      )
    }

    // Проверить пароль
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      console.log('[Auth Login] Invalid password for:', email)
      return NextResponse.json(
        { ok: false, error: 'CredentialsSignin' },
        { status: 401 }
      )
    }

    // Создать сессию в базе данных
    const sessionToken = randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

    // Удалить старые сессии пользователя (оставить только последние 5)
    const existingSessions = await db.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (existingSessions.length >= 5) {
      const sessionsToDelete = existingSessions.slice(4).map(s => s.id)
      await db.session.deleteMany({
        where: { id: { in: sessionsToDelete } },
      })
    }

    await db.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt,
      },
    })

    console.log('[Auth Login] Session created for:', email)

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    }

    // Вернуть ответ БЕЗ session token в теле — только httpOnly cookie
    const response = NextResponse.json({
      ok: true,
      user: userData,
    })

    // Установить session token как httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set({
      name: 'session-token',
      value: sessionToken,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('[Auth Login] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
