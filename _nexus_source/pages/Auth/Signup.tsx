import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const authStore = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      await authStore.signup(data.email, data.password, data.name);
      setSuccessEmail(data.email);
    } catch (err: any) {
      toast.error(err?.message || 'Sign up failed');
    }
  };

  // Success state
  if (successEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-zinc-900">O'Neill</span>
            </div>
            <span className="text-sm text-zinc-500">Estimating</span>
          </div>

          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-zinc-500 mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-medium text-zinc-700 mb-6">
            {successEmail}
          </p>
          <p className="text-xs text-zinc-400">
            Click the link in the email to confirm your account, then sign in.
          </p>

          <Link
            to="/login"
            className="inline-block mt-6 text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

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
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-zinc-700">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              {...register('name')}
              className="border-zinc-300 focus-visible:ring-orange-500"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-zinc-700">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="border-zinc-300 focus-visible:ring-orange-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
