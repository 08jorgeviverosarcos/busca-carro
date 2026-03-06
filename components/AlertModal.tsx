'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AlertModalProps = {
  searchParams?: string
}

export function AlertModal({ searchParams }: AlertModalProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, filtersJson: searchParams ?? '{}' }),
      })

      if (!res.ok) throw new Error('Error al crear alerta')

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setEmail('')
      }, 2000)
    } catch {
      setError('No se pudo crear la alerta. Intenta más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 gap-2"
      >
        <Bell className="w-4 h-4" />
        Crear alerta
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Crear alerta de búsqueda</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              Te notificaremos por email cuando aparezcan nuevos carros que coincidan con tus filtros actuales.
            </p>

            {success ? (
              <p className="text-green-400 text-center py-4">✅ Alerta creada correctamente</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
                >
                  {loading ? 'Creando...' : 'Activar alerta'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
