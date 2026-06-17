'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, AlertCircle, Loader2, Eye, EyeOff, UserPlus, CheckCircle, Shield, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Departments available for registration (with descriptions)
const REGISTRATION_DEPARTMENTS = [
  { id: 'methodology', name: 'Департамент методологии', description: 'Разработка образовательных программ и методических материалов' },
  { id: 'coordination', name: 'Департамент координации', description: 'Координация мероприятий, согласование бюджетов и ресурсов' },
  { id: 'agd', name: 'Аппарат генерального директора', description: 'Стратегическое управление и VIP-сопровождение' },
  { id: 'organization', name: 'Департамент организации', description: 'Организационная подготовка и логистика мероприятий' },
  { id: 'analytics', name: 'Департамент аналитики', description: 'Аналитика эффективности, NPS и финансовая отчётность' },
]

function getPasswordStrength(password: string): { score: number; label: string; color: string; tips: string[] } {
  if (!password) return { score: 0, label: '', color: '', tips: [] }
  const tips: string[] = []
  let score = 0
  if (password.length >= 8) score++
  else tips.push('Минимум 8 символов')
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  else tips.push('Добавьте заглавную букву')
  if (/[0-9]/.test(password)) score++
  else tips.push('Добавьте цифру')
  if (/[^A-Za-z0-9]/.test(password)) score++
  else tips.push('Добавьте спецсимвол')

  if (score <= 1) return { score: 1, label: 'Слабый', color: 'bg-red-500', tips }
  if (score <= 3) return { score: 2, label: 'Средний', color: 'bg-amber-500', tips }
  return { score: 3, label: 'Сильный', color: 'bg-emerald-500', tips }
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  if (!password) return null

  return (
    <div className="space-y-1.5">
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
      <div className="flex items-center justify-between">
        <p className={`text-[11px] ${
          strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
        }`}>
          Надёжность: {strength.label}
        </p>
      </div>
      {strength.tips.length > 0 && strength.score < 3 && (
        <div className="space-y-0.5">
          {strength.tips.map((tip, i) => (
            <p key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Touched state for real-time validation (must be before useEffect)
  const [emailTouched, setEmailTouched] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  // Email availability check
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null) // null = not checked yet
  const [emailChecking, setEmailChecking] = useState(false)
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null)

  const checkEmailAvailability = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck)) {
      setEmailAvailable(null)
      return
    }
    setEmailChecking(true)
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(emailToCheck)}`)
      if (res.ok) {
        const data = await res.json()
        setEmailAvailable(data.available)
      } else {
        setEmailAvailable(null)
      }
    } catch {
      setEmailAvailable(null)
    } finally {
      setEmailChecking(false)
    }
  }, [])

  // Debounced email check on change
  useEffect(() => {
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    if (!email || !emailTouched) {
      setEmailAvailable(null)
      return
    }
    emailCheckTimeout.current = setTimeout(() => {
      checkEmailAvailability(email)
    }, 500)
    return () => {
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    }
  }, [email, emailTouched, checkEmailAvailability])

  const router = useRouter()

  // Real-time validation
  const emailValid = !emailTouched || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const nameValid = !nameTouched || name.trim().length >= 2
  const passwordValid = !passwordTouched || password.length >= 8
  const confirmValid = !confirmTouched || password === confirmPassword
  const departmentValid = !!department
  const emailTaken = emailTouched && emailValid && email && emailAvailable === false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailTouched(true)
    setNameTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)
    setError('')

    // Client-side validation
    if (!email || !name || !password || !confirmPassword || !department) {
      setError('Все поля обязательны для заполнения')
      return
    }

    if (!emailValid) {
      setError('Некорректный формат email')
      return
    }

    if (emailTaken) {
      setError('Пользователь с таким email уже существует')
      return
    }

    if (!nameValid) {
      setError('Имя должно содержать не менее 2 символов')
      return
    }

    if (!passwordValid) {
      setError('Пароль должен содержать не менее 8 символов')
      return
    }

    if (!confirmValid) {
      setError('Пароли не совпадают')
      return
    }

    if (!termsAccepted) {
      setError('Необходимо принять условия использования')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/public-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, department }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации. Попробуйте ещё раз.')
        setIsLoading(false)
        return
      }

      // Success — show animation then redirect
      setShowSuccess(true)
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 2000)
    } catch (err) {
      console.error('[Register] Exception:', err)
      setError('Произошла ошибка при регистрации. Попробуйте ещё раз.')
      setIsLoading(false)
    }
  }

  // Success animation overlay
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E4002B] via-[#BD0024] to-[#190B62] p-4">
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-400 animate-in zoom-in duration-300" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Регистрация успешна!</h2>
          <p className="text-white/70 text-sm">Ваш аккаунт отправлен на рассмотрение администратору</p>
          <p className="text-white/50 text-xs mt-2">Перенаправление на страницу входа...</p>
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
                Регистрация
              </p>
              <p className="text-xs text-gray-400">
                Создайте аккаунт для входа в систему
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Иван Иванов"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  className={`h-11 ${!nameValid ? 'border-red-500 focus-visible:ring-red-500' : nameTouched && name ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''}`}
                />
                {!nameValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Минимум 2 символа
                  </p>
                )}
                {nameTouched && nameValid && name && (
                  <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Корректно
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
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
                    className={`h-11 pr-10 ${!emailValid ? 'border-red-500 focus-visible:ring-red-500' : emailTaken ? 'border-red-500 focus-visible:ring-red-500' : emailTouched && email && emailAvailable === true ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!emailChecking && emailAvailable === true && emailTouched && emailValid && email && (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    )}
                    {!emailChecking && emailTaken && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {!emailValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Введите корректный email
                  </p>
                )}
                {emailValid && emailTaken && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Пользователь с таким email уже существует
                  </p>
                )}
                {emailTouched && emailValid && email && emailAvailable === true && !emailChecking && (
                  <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Email доступен для регистрации
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Департамент</Label>
                <Select
                  value={department}
                  onValueChange={setDepartment}
                  disabled={isLoading}
                >
                  <SelectTrigger className={`w-full h-11 ${!departmentValid ? '' : 'border-emerald-500'}`}>
                    <SelectValue placeholder="Выберите департамент" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex flex-col">
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {department && (
                  <p className="text-[11px] text-muted-foreground">
                    {REGISTRATION_DEPARTMENTS.find(d => d.id === department)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
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
                <PasswordStrengthBar password={password} />
                {!passwordValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Минимум 8 символов
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={`h-11 pr-10 ${!confirmValid ? 'border-red-500 focus-visible:ring-red-500' : confirmTouched && confirmPassword ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!confirmValid && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Пароли не совпадают
                  </p>
                )}
                {confirmTouched && confirmValid && confirmPassword && (
                  <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Пароли совпадают
                  </p>
                )}
              </div>

              {/* Terms of service */}
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50/50">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-xs font-medium cursor-pointer">
                    Принимаю условия использования
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Я соглашаюсь с правилами обработки персональных данных и условиями использования системы CRM Сенеж
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !termsAccepted}
                className="w-full h-11 bg-gradient-to-r from-[#E4002B] to-[#BD0024] hover:from-[#BD0024] hover:to-[#190B62] text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Зарегистрироваться
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Link to login */}
        <div className="text-center">
          <a
            href="/login"
            className="text-white/80 hover:text-white text-sm transition-colors hover:underline"
          >
            Уже есть аккаунт? Войти
          </a>
        </div>
      </div>
    </div>
  )
}
