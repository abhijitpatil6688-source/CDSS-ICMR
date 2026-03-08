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
    const correctPassword = import.meta.env.VITE_APP_PASSWORD as string | undefined
    if (!correctPassword) {
      console.error('VITE_APP_PASSWORD environment variable is not set.')
      setError(true)
      setInput('')
      return
    }
    if (input === correctPassword) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white rounded-xl px-8 py-10 shadow-lg min-w-80 text-center">
        <h2 className="mb-2 text-blue-900 text-xl font-semibold">CDSS · ICMR</h2>
        <p className="text-gray-500 mb-6 text-sm">
          This tool is for authorised users only.<br />Enter the access password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password-input" className="sr-only">
            Access password
          </label>
          <input
            id="password-input"
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            aria-label="Access password"
            aria-describedby={error ? 'password-error' : undefined}
            autoFocus
            className={clsx(
              'w-full px-3 py-2.5 rounded-md border text-[15px] outline-none mb-2 box-border',
              'focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              error ? 'border-red-500' : 'border-slate-300',
            )}
          />
          {error && (
            <p
              id="password-error"
              role="alert"
              aria-live="assertive"
              className="text-red-500 text-xs mb-2"
            >
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-blue-700 text-white text-[15px] cursor-pointer mt-1 hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
