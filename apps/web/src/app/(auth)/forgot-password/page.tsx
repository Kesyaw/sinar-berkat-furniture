'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: emailRedirectTo,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-stone-800">
            Lupa Password
          </CardTitle>
          <p className="text-stone-500 text-sm mt-1">
            Masukkan email Anda untuk menerima tautan atur ulang password
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                Tautan atur ulang password telah dikirim ke email Anda. Silakan periksa kotak masuk Anda.
              </p>
              <a href="/login" className="block text-center text-sm font-semibold text-stone-800 hover:underline">
                Kembali ke Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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
                {loading ? 'Mengirim...' : 'Kirim Tautan Atur Ulang'}
              </Button>
              <p className="text-center text-sm text-stone-600 mt-4">
                <a href="/login" className="font-semibold text-stone-800 hover:underline">
                  Kembali ke Login
                </a>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
