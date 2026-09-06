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
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type F = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: F) => {
    try {
      await login(data.email, data.password);
      navigate('/app/dashboard');
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
          <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Continue your learning journey</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="Your password" error={errors.password?.message} {...register('password')} />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-muted hover:text-primary">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>Log in</Button>
          </form>
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted">
              No account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">Create one</Link>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-muted mt-4">Demo: demo@learno.pk / Student@12345</p>
      </div>
    </div>
  );
}
