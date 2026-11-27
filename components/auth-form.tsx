'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode, nextPath }: { mode: 'sign-in' | 'sign-up'; nextPath: string }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'
  const otherHref = `${isSignUp ? '/sign-in' : '/sign-up'}?next=${encodeURIComponent(nextPath)}`

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name: displayName.trim() })
      : await authClient.signIn.email({ email, password })

    setLoading(false)
    if (result.error) {
      setError('Tidak dapat memproses akun. Periksa kembali data dan coba lagi.')
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#071322] px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101e31] p-7 shadow-2xl shadow-black/30 sm:p-9">
        <Link href="/office-life.html" className="text-sm font-black tracking-[0.18em] text-slate-100">
          OFFICE<span className="text-amber-300">QUEST</span>
        </Link>
        <p className="mt-8 text-xs font-bold tracking-[0.24em] text-cyan-300">PRODISTIK · PLAYER ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {isSignUp ? 'Buat akun pemain' : 'Selamat datang kembali'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {isSignUp
            ? 'Simpan XP, misi, dan koleksi agar tetap tersedia di perangkat lain.'
            : 'Masuk untuk melanjutkan progres OfficeQuest.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <label htmlFor="display-name" className="text-sm font-semibold">Nama panggilan</label>
              <input
                id="display-name"
                name="name"
                type="text"
                autoComplete="nickname"
                minLength={2}
                maxLength={24}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-12 rounded-xl border border-white/10 bg-[#081525] px-4 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#081525] px-4 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold">Kata sandi</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#081525] px-4 text-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            />
          </div>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 rounded-xl bg-amber-300 px-5 font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Memproses…' : isSignUp ? 'Buat akun dan mulai' : 'Masuk ke OfficeQuest'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <Link href={otherHref} className="font-semibold text-cyan-300 underline-offset-4 hover:underline">
            {isSignUp ? 'Masuk' : 'Daftar'}
          </Link>
        </p>
      </section>
    </main>
  )
}
