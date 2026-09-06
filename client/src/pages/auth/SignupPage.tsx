import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../lib/api';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type F = z.infer<typeof schema>;

export default function SignupPage() {
  const { register: reg } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: F) => {
    try {
      const user = await reg(data.email, data.password, data.name);
      navigate(user.isOnboarded ? '/app/dashboard' : '/onboarding');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-primary text-lg">Learno</span>
          </Link>
          <h1 className="text-2xl font-bold text-primary">Create your account</h1>
          <p className="text-muted text-sm mt-1">Start your AI-powered learning journey</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Full name" placeholder="Your name" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" placeholder="Repeat your password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" className="w-full" isLoading={isSubmitting}>Create account</Button>
          </form>
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
