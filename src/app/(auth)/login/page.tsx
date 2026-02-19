'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  // 오픈 리다이렉트 방어: 상대 경로만 허용, 프로토콜 상대 URL(//) 차단
  const redirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('비밀번호 재설정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
      return
    }

    setSuccess('비밀번호 재설정 링크를 이메일로 보냈습니다. 이메일을 확인해주세요.')
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    })

    if (error) {
      console.error('Signup error:', error)
      if (error.message.includes('already registered')) {
        setError('이미 가입된 이메일입니다.')
      } else if (error.message.includes('Email rate limit')) {
        setError('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.')
      } else if (error.message.includes('Invalid email')) {
        setError('유효하지 않은 이메일 주소입니다.')
      } else if (error.message.includes('Password')) {
        setError('비밀번호가 요구 조건을 충족하지 않습니다.')
      } else {
        setError(`회원가입 실패: ${error.message}`)
      }
      setLoading(false)
      return
    }

    setSuccess('회원가입이 완료되었습니다! 관리자 승인 후 이용 가능합니다.')
    setLoading(false)

    // 자동 로그인 후 pending 페이지로 이동
    setTimeout(() => {
      router.push('/pending')
      router.refresh()
    }, 1500)
  }

  const handleSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword

  const submitLabel = mode === 'login' ? '로그인' : mode === 'signup' ? '회원가입' : '재설정 링크 보내기'
  const loadingLabel = mode === 'login' ? '로그인 중...' : mode === 'signup' ? '가입 중...' : '전송 중...'

  return (
    <div>
      {/* 3개 탭 전환 */}
      <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'login', label: '로그인' },
          { key: 'signup', label: '회원가입' },
          { key: 'forgot', label: '비밀번호 찾기' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setMode(tab.key); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mode === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'forgot' && (
        <p className="text-sm text-gray-500 mb-4">가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이름 (회원가입 시만) */}
        {mode === 'signup' && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={mode === 'signup'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="홍길동"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            placeholder="example@email.com"
          />
        </div>

        {/* 비밀번호 (로그인/회원가입 시만) */}
        {mode !== 'forgot' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder={mode === 'signup' ? '6자 이상 입력' : '••••••••'}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {loadingLabel}
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </form>

      {mode === 'signup' && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          회원가입 후 관리자 승인이 필요합니다.
        </p>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">청파중앙교회</h1>
          <p className="text-slate-400 mt-1">교육위원회 통합 관리 시스템</p>
        </div>

        {/* 로그인/회원가입 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
          <Suspense fallback={<div className="h-64 flex items-center justify-center">로딩 중...</div>}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
