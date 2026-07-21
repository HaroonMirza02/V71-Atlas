import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { Radar, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-100 font-sans">
      <div className="w-full max-w-[380px] px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
            <Radar className="h-6 w-6 text-zinc-100" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-zinc-100">Atlas Intelligence</h1>
          <p className="mt-2 text-[14px] text-zinc-400 text-center leading-relaxed">
            Sign in to your workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-[#09090b] p-8 shadow-xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[13px] font-medium text-zinc-300">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:bg-zinc-900 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[13px] font-medium text-zinc-300">Password</label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:bg-zinc-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-100 text-[14px] font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </button>

              <div className="pt-6 mt-6 border-t border-zinc-800/80">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => autofill('ADMIN')} className="flex h-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors">
                    Admin Demo
                  </button>
                  <button type="button" onClick={() => autofill('ANALYST')} className="flex h-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors">
                    Analyst Demo
                  </button>
                </div>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
}
