import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-finomik-blue flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h1 className="font-black text-3xl text-finomik-blue mb-1">Finomik</h1>
        <p className="text-finomik-gray text-sm mb-8">Content Hub</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-finomik-blue mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-finomik-gray-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finomik-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-finomik-blue mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-finomik-gray-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finomik-blue"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-finomik-blue text-white font-bold py-2 rounded-lg hover:bg-finomik-blue-mid transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
