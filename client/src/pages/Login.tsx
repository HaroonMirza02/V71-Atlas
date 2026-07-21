import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { Radar, Loader2, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.accessToken, res.data.refreshToken, res.data.user);
      toast.success('Successfully logged in');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password reset link sent to your email.');
      setView('login');
    }, 1500);
  };

  const autofill = (role: 'ADMIN' | 'ANALYST') => {
    if (role === 'ADMIN') {
      setEmail('admin@vision71.com');
      setPassword('Password123!');
    } else {
      setEmail('analyst@vision71.com');
      setPassword('Password123!');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 mix-blend-screen filter blur-[120px] opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/10 mix-blend-screen filter blur-[150px] opacity-60 animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-purple-600/10 mix-blend-screen filter blur-[100px] opacity-50"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="z-10 w-full max-w-[420px] px-6">
        <div className="mb-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
            <div className="absolute inset-[2px] rounded-[14px] bg-[#050505] flex items-center justify-center">
               <Radar className="h-7 w-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Atlas Intelligence</h1>
          <p className="mt-3 text-[15px] text-slate-400 text-center leading-relaxed">
            Enterprise market intelligence. Discover, rank, and qualify revenue opportunities globally.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none"></div>
          
          {view === 'login' ? (
            <form onSubmit={handleLogin} className="relative space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[13px] font-medium text-slate-300 ml-1">Work Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@vision71.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1 pr-1">
                    <label htmlFor="password" className="text-[13px] font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-indigo-600 font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-70 disabled:hover:bg-indigo-600"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10 flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" /></span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer"></div>
                  </>
                )}
              </button>

              <div className="pt-6 mt-6 border-t border-white/5">
                <div className="text-center mb-4">
                   <span className="bg-[#050505] px-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Demo Access</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => autofill('ADMIN')} className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[13px] font-medium text-slate-300 hover:bg-white/10 transition-colors">
                    Admin
                  </button>
                  <button type="button" onClick={() => autofill('ANALYST')} className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[13px] font-medium text-slate-300 hover:bg-white/10 transition-colors">
                    Analyst
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="relative space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-6 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-4 border border-white/10">
                   <Lock className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Reset Password</h2>
                <p className="mt-2 text-[14px] text-slate-400">
                  Enter your email to receive a secure recovery link.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-[13px] font-medium text-slate-300 ml-1">Work Email</label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="name@vision71.com"
                  required
                  className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-black transition-all hover:bg-slate-200 disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Recovery Link'}
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className="w-full text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
