import { useState } from 'react'

const CORRECT_PASSWORD = 'Abhijit@6688'
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
    if (input === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '2.5rem 2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: 320,
        textAlign: 'center',
      }}>
        <h2 style={{ marginBottom: 8, color: '#1a365d' }}>CDSS · ICMR</h2>
        <p style={{ color: '#555', marginBottom: 24, fontSize: 14 }}>
          This tool is for authorised users only.<br />Enter the access password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: error ? '1.5px solid #e53e3e' : '1.5px solid #cbd5e0',
              fontSize: 15,
              boxSizing: 'border-box',
              marginBottom: 8,
              outline: 'none',
            }}
          />
          {error && (
            <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 8 }}>
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 6,
              background: '#2b6cb0',
              color: '#fff',
              border: 'none',
              fontSize: 15,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
