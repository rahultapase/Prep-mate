import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, ArrowRight, Eye, EyeOff, UserCheck } from 'lucide-react';
import { Header } from './Header';

// Default demo account seeded by the server (see DEMO_EMAIL / DEMO_PASSWORD in .env)
const DEMO_EMAIL = 'rahul@prepmate.local';
const DEMO_PASSWORD = 'demo1234';

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/home', { replace: true });
    } catch {
      // Error message is shown from the auth context
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden pt-20">
        {/* Animated background elements */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-violet-500/20 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-violet-900/30 rounded-full mb-4 border border-violet-500/20">
              <Lock className="h-4 w-4 text-violet-400 mr-2" aria-hidden="true" />
              <span className="text-sm font-medium text-violet-300">Welcome Back!</span>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">
              Ready to <span className="gradient-text">Ace Your Next Interview</span>?
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="relative">
              <label htmlFor="login-email" className="sr-only">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="Your email address"
                className="w-full px-4 py-3 rounded-xl bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent border border-gray-600 placeholder-gray-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="relative">
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent border border-gray-600 placeholder-gray-400"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>

            {error && (
              <div role="alert" className="text-red-400 text-sm flex items-center p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                <span className="mr-2" aria-hidden="true">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" aria-hidden="true"></div>
                  Signing you in...
                </>
              ) : (
                <>
                  Continue Your Interview Prep
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Demo account hint */}
          <div className="p-4 rounded-xl bg-violet-900/20 border border-violet-500/20 text-sm text-gray-300">
            <p className="mb-1 font-semibold text-violet-300">Demo account</p>
            <p>
              Email: <span className="font-mono text-white">{DEMO_EMAIL}</span>
              <br />
              Password: <span className="font-mono text-white">{DEMO_PASSWORD}</span>
            </p>
            <button
              type="button"
              onClick={fillDemo}
              disabled={submitting}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition-all duration-300 border border-gray-600 hover:border-violet-500/50 disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Use demo account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
