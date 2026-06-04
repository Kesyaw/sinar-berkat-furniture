'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      const messageParam = params.get('message')
      if (errorParam === 'auth_callback_failed') {
        setError('Proses login otomatis gagal. Silakan coba masuk kembali.')
      } else if (errorParam) {
        setError(errorParam)
      }

      if (messageParam === 'password_reset_success') {
        setMessage('Password berhasil diperbarui. Silakan masuk dengan password baru Anda.')
      }
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Sync user ke NestJS database setelah login berhasil
    if (data.session) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            supabaseId: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name,
          }),
        })
        if (!res.ok) {
          throw new Error('Failed to sync session with backend')
        }
      } catch (err) {
        console.error('Failed to sync user to backend:', err)
        await supabase.auth.signOut()
        setError('Gagal menyinkronkan sesi dengan server. Silakan coba lagi.')
        setLoading(false)
        return
      }
    }

    // Get next param from query string safely
    let redirectPath = '/'
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const nextParam = params.get('next')
      if (nextParam && nextParam.startsWith('/')) {
        redirectPath = nextParam
      }
    }

    router.push(redirectPath)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-stone-800">
            Sinar Berkat Furniture
          </CardTitle>
          <p className="text-stone-500 text-sm mt-1">Masuk ke akun Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="/forgot-password" className="text-xs text-stone-600 hover:underline">
                  Lupa password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {message && (
              <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
                {message}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
            <p className="text-center text-sm text-stone-600 mt-4">
              Belum punya akun?{' '}
              <a href="/register" className="font-semibold text-stone-800 hover:underline">
                Daftar di sini
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
