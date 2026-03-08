import { useState } from 'react'
import { clsx } from 'clsx'

const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string
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
    if (CORRECT_PASSWORD && CORRECT_PASSWORD.length > 0 && input === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white rounded-xl px-8 py-10 shadow-lg w-80 text-center">
        <h2 className="mb-2 text-blue-900 text-xl font-semibold">CDSS · ICMR</h2>
        <p className="text-gray-500 mb-6 text-sm">
          This tool is for authorised users only.<br />Enter the access password to continue.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="password-input" className="sr-only">
            Access password
          </label>
          <input
            id="password-input"
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            aria-invalid={error}
            aria-describedby={error ? 'password-error' : undefined}
            className={clsx(
              'w-full px-3 py-2.5 rounded-md border text-sm mb-2 outline-none',
              'focus:ring-2 focus:ring-blue-300',
              error ? 'border-red-500' : 'border-slate-300',
            )}
          />
          {error && (
            <p
              id="password-error"
              role="alert"
              aria-live="assertive"
              className="text-red-600 text-xs mb-2"
            >
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-blue-700 text-white text-sm cursor-pointer hover:bg-blue-800 transition-colors mt-1"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
