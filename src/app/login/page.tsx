'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, AlertCircle, Loader2, Eye, EyeOff, Info, CheckCircle, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth, storeUserData } from '@/components/auth-provider'
import { toast } from '@/hooks/use-toast'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Слабый', color: 'bg-red-500' }
  if (score <= 3) return { score: 2, label: 'Средний', color: 'bg-amber-500' }
  return { score: 3, label: 'Сильный', color: 'bg-emerald-500' }
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  if (!password) return null

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] ${
        strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
      }`}>
        Надёжность: {strength.label}
      </p>
    </div>
  )
}

// Test accounts for development mode only — completely excluded from production builds
const TEST_ACCOUNTS = process.env.NODE_ENV === 'development' ? [
  { role: 'Администратор', email: 'admin@senez.ru', password: 'admin123', color: 'amber' },
  { role: 'Методология', email: 'methodology@senez.ru', password: 'method123', color: 'blue' },
  { role: 'Координация', email: 'coordination@senez.ru', password: 'coordination123', color: 'purple' },
  { role: 'АГД', email: 'agd@senez.ru', password: 'agd123', color: 'rose' },
  { role: 'Организация', email: 'organization@senez.ru', password: 'org123', color: 'orange' },
  { role: 'Аналитика', email: 'analytics@senez.ru', password: 'analytics123', color: 'teal' },
] : []

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const searchParams = useSearchParams()

  // Check if redirected from registration page
  const isRegistered = searchParams.get('registered') === 'true'
  const [registeredToastDismissed, setRegisteredToastDismissed] = useState(false)
  const showRegisteredToast = isRegistered && !registeredToastDismissed
  const { isAuthenticated, isLoading: authLoading, refreshSession } = useAuth()
  const router = useRouter()

  // Если пользователь уже авторизован — редирект на главную
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  // Автоматически скрываем тост регистрации через 5 секунд
  useEffect(() => {
    if (showRegisteredToast) {
      const timer = setTimeout(() => setRegisteredToastDismissed(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [showRegisteredToast])

  // Обработка ошибок от URL параметра ?error=
  const authError = searchParams.get('error')
  const errorMessage = useMemo(() => {
    if (!authError) return ''
    switch (authError) {
      case 'CredentialsSignin':
        return 'Неверный email или пароль'
      case 'AccountPendingApproval':
        return 'Ваш аккаунт ожидает одобрения администратором'
      case 'SessionRequired':
        return 'Необходима авторизация'
      default:
        return 'Ошибка входа. Попробуйте ещё раз.'
    }
  }, [authError])

  // Validation
  const emailValid = !emailTouched || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = !passwordTouched || password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailTouched(true)
    setPasswordTouched(true)
    setError('')

    if (!email || !password) {
      setError('Заполните все поля')
      return
    }

    if (!emailValid) {
      setError('Некорректный формат email')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.ok) {
        if (data.error === 'CredentialsSignin') {
          setError('Неверный email или пароль')
        } else if (data.error === 'AccountPendingApproval') {
          setError('Ваш аккаунт ожидает одобрения администратором. После подтверждения вы получите доступ к системе. Если ожидание затягивается — обратитесь к руководителю департамента.')
        } else {
          setError(data.error || 'Ошибка входа. Попробуйте ещё раз.')
        }
        setIsLoading(false)
        return
      }

      // Успешная авторизация! Cookie уже установлены сервером
      if (data.user) {
        storeUserData(data.user)
      }

      await refreshSession()
      window.location.href = '/'
    } catch (err) {
      console.error('[Login] Exception:', err)
      setError('Произошла ошибка при входе. Попробуйте ещё раз.')
      setIsLoading(false)
    }
  }

  // Пока проверяем авторизацию — показываем загрузку
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E4002B] via-[#BD0024] to-[#190B62]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <p className="text-white/80 text-sm">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  // Если уже авторизован — не показываем форму (ждём редирект)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E4002B] via-[#BD0024] to-[#190B62]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <p className="text-white/80 text-sm">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E4002B] via-[#BD0024] to-[#190B62] p-3 sm:p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/5" />
      </div>

      <div className="w-full max-w-sm sm:max-w-md space-y-4">
        <Card className="relative shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo / Brand */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <img src="/logos/senezh-logo-red.svg" alt="Мастерская управления Сенеж" className="h-6 sm:h-8" />
              <img src="/logos/rsv-logo-color.svg" alt="Россия — страна возможностей" className="h-5 sm:h-6" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                CRM Сенеж
              </h1>
              <p className="text-sm text-gray-500">
                Система управления образовательными мероприятиями
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-center text-sm font-medium text-gray-700">
              Войдите в личный кабинет
            </p>

            {/* Success toast after registration */}
            {showRegisteredToast && (
              <div className="flex items-center gap-2 text-sm text-[#E4002B] bg-[#FFF1F3] border border-[#FF9DAF] rounded-lg px-3 py-2.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Регистрация прошла успешно! Ваш аккаунт ожидает одобрения администратором.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@senez.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className={`h-11 ${!emailValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {!emailValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Введите корректный email
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className={`h-11 pr-10 ${!passwordValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && <PasswordStrengthBar password={password} />}
                {!passwordValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Введите пароль
                  </p>
                )}
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-[#E4002B] hover:text-[#BD0024] transition-colors hover:underline"
                  onClick={() => setShowForgotPasswordDialog(true)}
                >
                  Забыли пароль?
                </button>
              </div>

              {(error || errorMessage) && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error || errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-[#E4002B] to-[#BD0024] hover:from-[#BD0024] hover:to-[#190B62] text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Registration link */}
        <div className="text-center">
          <a
            href="/register"
            className="text-white/80 hover:text-white text-sm transition-colors hover:underline"
          >
            Зарегистрироваться
          </a>
        </div>

        {/* Help toggle — only in development */}
        {process.env.NODE_ENV === 'development' && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowCredentialsDialog(true)}
            className="text-white/70 hover:text-white text-xs flex items-center gap-1 mx-auto transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            Тестовые учётные записи
          </button>
        </div>
        )}

        {/* Credentials Dialog — only in development */}
        {process.env.NODE_ENV === 'development' && (
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#E4002B]" />
                Тестовые учётные записи
              </DialogTitle>
              <DialogDescription>
                Используйте эти данные для входа в тестовом режиме
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(account.password)
                    setShowCredentialsDialog(false)
                    toast({ title: `Заполнены данные: ${account.role}` })
                  }}
                >
                  <div>
                    <span className="font-medium text-sm text-gray-800">{account.role}</span>
                    <br />
                    <span className="text-xs text-gray-500">{account.email}</span>
                  </div>
                  <span className="font-mono text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                    {account.password}
                  </span>
                </button>
              ))}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-medium text-sm text-gray-700">Сотрудники</span>
                <br />
                <span className="text-xs text-gray-500">ivanov@senez.ru, tikhonova@senez.ru и др.</span>
                <br />
                <span className="text-xs text-gray-500">Пароль: </span>
                <span className="font-mono text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">emp123</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}

        {/* Forgot Password Dialog */}
        <Dialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#E4002B]" />
                Восстановление пароля
              </DialogTitle>
              <DialogDescription>
                Функция восстановления пароля будет доступна в следующей версии
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#FFF1F3] flex items-center justify-center mb-4">
                <KeyRound className="h-7 w-7 text-[#E4002B]" />
              </div>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Функция восстановления пароля будет доступна в следующей версии системы. Если вы забыли пароль, обратитесь к администратору.
              </p>
              <Button
                className="bg-[#E4002B] hover:bg-[#BD0024] text-white"
                onClick={() => setShowForgotPasswordDialog(false)}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E4002B] via-[#BD0024] to-[#190B62]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <p className="text-white/80 text-sm">Загрузка...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
