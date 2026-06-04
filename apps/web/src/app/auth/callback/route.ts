import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.session) {
      // Call POST /auth/sync after successful session creation
      try {
        const syncRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            supabaseId: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
          }),
        })
        if (!syncRes.ok) {
          throw new Error('Sync failed')
        }
      } catch (syncError) {
        console.error('Error syncing user on callback:', syncError)
        // Sign user out since sync failed
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
      }

      // If successful, redirect to next path
      const targetUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/`
      return NextResponse.redirect(targetUrl)
    }
  }

  // Return the user to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
