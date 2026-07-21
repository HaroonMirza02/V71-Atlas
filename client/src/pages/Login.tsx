import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { Radar, Loader2, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    // Simulate API call for forgot password
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password reset link sent to your email.');
      setView('login');
    }, 1500);
  };

  // Demo autofill for hardcoded users
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute -left-[10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-[10%] bottom-[-10%] h-[40rem] w-[40rem] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-foreground text-background shadow-lg shadow-foreground/20">
            <Radar className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Atlas Intelligence</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Professional market intelligence for discovering, ranking, and qualifying revenue opportunities.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@vision71.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>

              <div className="mt-6 flex flex-col space-y-3 pt-6 border-t border-border/50">
                <div className="text-center text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Demo Accounts</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => autofill('ADMIN')} className="text-xs">
                    Admin
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => autofill('ANALYST')} className="text-xs">
                    Analyst
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">Reset Password</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we'll send you a recovery link.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Work Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@vision71.com"
                  required
                  className="bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Recovery Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('login')}
                className="w-full text-xs text-muted-foreground"
              >
                Back to Sign In
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
