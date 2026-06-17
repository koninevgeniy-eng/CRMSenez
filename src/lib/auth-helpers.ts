import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * Get the authenticated user from the request.
 * Reads session token from httpOnly cookies only (no localStorage/header fallback).
 * Looks up the session in the database.
 */
export async function getAuthUser(request: Request): Promise<{
  id: string
  email: string
  name: string
  role: string
  department: string | null
} | null> {
  try {
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
      return null
    }

    // Look up session in database
    const session = await db.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    })

    if (!session) {
      return null
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }

    // Check user is active
    if (!session.user.isActive) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }

    // Check user is approved
    if (!session.user.isApproved) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      department: session.user.department,
    }
  } catch (error) {
    console.error('[getAuthUser] Error:', error)
    return null
  }
}

/**
 * Check if the request is from an admin user.
 * Returns the user if admin, null otherwise.
 */
export async function getAdminUser(request: Request) {
  const user = await getAuthUser(request)
  if (!user || user.role !== 'admin') {
    return null
  }
  return user
}

/**
 * Check if the request is from an admin or manager user.
 * Returns the user if admin/manager, null otherwise.
 */
export async function getManagerUser(request: Request) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null
  }
  return user
}
