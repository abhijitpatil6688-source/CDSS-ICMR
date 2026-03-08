import { useState } from 'react'
import { clsx } from 'clsx'

const SESSION_KEY = 'cdss_auth'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const correctPassword = import.meta.env.VITE_APP_PASSWORD
    if (!correctPassword) {
      console.warn('VITE_APP_PASSWORD is not set — access will be denied until it is configured.')
    }
    if (correctPassword && input === correctPassword) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-xl px-8 py-10 shadow-lg w-80 text-center">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">CDSS · ICMR</h2>
        <p className="text-gray-500 mb-6 text-sm">
          This tool is for authorised users only.<br />Enter the access password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="cdss-password" className="sr-only">Access password for CDSS ICMR</label>
          <input
            id="cdss-password"
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            aria-label="Password"
            autoFocus
            className={clsx(
              'w-full px-3 py-2.5 rounded-md border text-sm mb-2 outline-none',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              error ? 'border-red-500' : 'border-gray-300',
            )}
          />
          {error && (
            <p role="alert" aria-live="assertive" className="text-red-500 text-xs mb-2">
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium mt-1 cursor-pointer transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
