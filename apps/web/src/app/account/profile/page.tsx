'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchUserProfile, updateUserProfile } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    async function getProfile() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login?next=/account/profile')
          return
        }

        const res = await fetchUserProfile(session.access_token)
        setFullName(res.fullName || '')
        setPhone(res.phone || '')
        setEmail(res.email || '')
      } catch (err: any) {
        console.error('Error fetching customer profile:', err)
        setError('Gagal memuat data profil Anda. Silakan coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [router])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setUpdating(true)
    setError(null)
    setSuccess(null)
    setValidationError(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setValidationError('Nama lengkap harus minimal 2 karakter.')
      setUpdating(false)
      return
    }

    if (phone && !/^[0-9+\-\s()]{5,20}$/.test(phone)) {
      setValidationError('Format nomor telepon tidak valid. Gunakan format angka standar.')
      setUpdating(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?next=/account/profile')
        return
      }

      const res = await updateUserProfile(session.access_token, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      })

      setFullName(res.fullName || '')
      setPhone(res.phone || '')
      setSuccess('Profil Anda berhasil diperbarui.')
    } catch (err: any) {
      console.error('Error updating customer profile:', err)
      setError(err.message ?? 'Gagal memperbarui profil. Silakan coba lagi.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-stone-500">Memuat profil Anda...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Profil Saya</h1>
        <p className="text-stone-500 text-sm">Kelola informasi pribadi Anda di sini</p>
      </div>

      <Card className="border-stone-200 shadow-sm bg-white">
        <CardContent className="pt-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-stone-50 border-stone-200 text-stone-500 cursor-not-allowed"
              />
              <p className="text-xs text-stone-400">Email tidak dapat diubah.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama Lengkap Anda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={updating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon (opsional)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={updating}
              />
            </div>

            {validationError && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                {validationError}
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                {success}
              </p>
            )}

            <Button
              type="submit"
              disabled={updating}
              className="w-full md:w-auto"
            >
              {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
