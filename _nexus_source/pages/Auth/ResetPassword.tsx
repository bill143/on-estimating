import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Loader2, CheckCircle } from 'lucide-react';

const resetSchema = z.object({
  email: z.string().email('Valid email required'),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      setSuccessEmail(data.email);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email');
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
            We sent a password reset link to
          </p>
          <p className="text-sm font-medium text-zinc-700 mb-6">
            {successEmail}
          </p>
          <p className="text-xs text-zinc-400">
            Click the link in the email to set a new password.
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

        <h2 className="text-lg font-semibold text-zinc-900 text-center mb-1">
          Reset your password
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-6">
          Enter the email associated with your account and we'll send a reset
          link.
        </p>

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

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        {/* Back to sign in */}
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link
            to="/login"
            className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
