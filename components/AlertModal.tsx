'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/gradient-button'
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
        className="border-white/10 text-slate-300 hover:text-white hover:border-white/20 gap-2"
      >
        <Bell className="w-4 h-4" />
        Crear alerta
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0B0B0F] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Crear alerta de búsqueda</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">
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
                  className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-500"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <GradientButton
                  type="submit"
                  disabled={loading}
                  size="lg"
                  fullWidth
                  className="font-semibold"
                >
                  {loading ? 'Creando...' : 'Activar alerta'}
                </GradientButton>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
