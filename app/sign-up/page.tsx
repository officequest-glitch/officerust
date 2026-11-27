import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { auth } from '@/lib/auth'
import { safeRedirectPath } from '@/lib/safe-redirect'

type PageProps = { searchParams: Promise<{ next?: string }> }

export default async function SignUpPage({ searchParams }: PageProps) {
  const nextPath = safeRedirectPath((await searchParams).next)
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect(nextPath)

  return <AuthForm mode="sign-up" nextPath={nextPath} />
}
