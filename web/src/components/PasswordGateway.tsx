import { useState, FormEvent } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const SESSION_KEY = 'cdss_auth'
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? 'icmr2024'

interface Props {
  children: React.ReactNode
}

export default function PasswordGateway({ children }: Props) {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (authenticated) {
    return <>{children}</>
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setAuthenticated(true)
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CDSS – ICMR</h1>
          <p className="text-sm text-gray-500 mt-1">Clinical Decision Support System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Access restricted</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            This application is for authorised healthcare professionals only.
            Please enter the access password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter access password"
                  autoFocus
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Unlock
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ICMR Radiology Advisory — for clinical use only
        </p>
      </div>
    </div>
  )
}
