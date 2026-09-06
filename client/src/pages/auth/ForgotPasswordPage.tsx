import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function ForgotPasswordPage() {
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
          <h1 className="text-2xl font-bold text-primary">Reset password</h1>
          <p className="text-muted text-sm mt-1">Password reset coming soon.</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" disabled />
          <Button className="w-full" disabled>Send reset link (coming soon)</Button>
          <p className="text-center text-sm text-muted">
            <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
