import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password';
  if (message.includes('Email not confirmed')) return 'Please confirm your email first';
  if (message.includes('Too many requests')) return 'Too many attempts — please wait a moment';
  return message;
}

export default function Login() {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      if (!isSupabaseConfigured()) {
        authStore.setMockUser();
        navigate('/dashboard');
        toast.success('Running in offline mode \u2014 signed in as Bill Asmar');
        return;
      }

      await authStore.login(data.email, data.password);
      navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(mapAuthError(err?.message || 'Sign in failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <HardHat className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-zinc-900">O'Neill</span>
          </div>
          <span className="text-sm text-zinc-500">Estimating</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-700">
              Email
            </Label>
            <Input
              id="email"
              type="text"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
              className="border-zinc-300 focus-visible:ring-orange-500"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-700">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password')}
                className="border-zinc-300 focus-visible:ring-orange-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end">
            <Link
              to="/reset-password"
              className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
