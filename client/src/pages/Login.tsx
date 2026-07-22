import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { Radar, Loader2 } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground font-sans px-4 py-8">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background shadow-xs">
            <Radar className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Atlas Intelligence</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-center">
            Sign in to your Vision71 workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-foreground">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@vision71.com"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-foreground">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </button>

            <div className="pt-5 mt-5 border-t border-border">
              <p className="text-center text-xs text-muted-foreground mb-3 px-1">
                Want to explore? Tap <strong className="text-foreground font-semibold">Admin Demo</strong> or <strong className="text-foreground font-semibold">Analyst Demo</strong> below to auto-fill credentials, then click Continue.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  type="button" 
                  onClick={() => autofill('ADMIN')} 
                  className="flex h-9 items-center justify-center rounded-md border border-border bg-secondary text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  Admin Demo
                </button>
                <button 
                  type="button" 
                  onClick={() => autofill('ANALYST')} 
                  className="flex h-9 items-center justify-center rounded-md border border-border bg-secondary text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
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
