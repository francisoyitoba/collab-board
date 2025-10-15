import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize role from query string if provided (e.g., ?role=employer)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qpRole = (params.get('role') || '').toLowerCase();
    if (qpRole === 'employer' || qpRole === 'seeker') {
      setRole(qpRole as 'seeker' | 'employer');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, role);
      
      // Redirect after successful registration
      if (role === 'seeker') {
        navigate('/seeker/profile');
      } else {
        navigate('/employer');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block">
          <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-brand">
            <h2 className="text-3xl font-bold mb-3">Create your JobPulse account</h2>
            <p className="text-brand-100">Join a growing network of seekers and employers.</p>
            <div className="mt-6 flex items-center space-x-4 text-brand-100">
              <div className="h-2 w-2 rounded-full bg-brand-200"></div>
              <p>Personalized recommendations for seekers</p>
            </div>
            <div className="mt-2 flex items-center space-x-4 text-brand-100">
              <div className="h-2 w-2 rounded-full bg-brand-200"></div>
              <p>Streamlined posting and chat for employers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-brand p-8 w-full max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-medium text-brand-600 hover:text-brand-700">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-center gap-6">
              <label className="inline-flex items-center">
                <input
                  id="role-seeker"
                  name="role"
                  type="radio"
                  checked={role === 'seeker'}
                  onChange={() => setRole('seeker')}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">Job Seeker</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  id="role-employer"
                  name="role"
                  type="radio"
                  checked={role === 'employer'}
                  onChange={() => setRole('employer')}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">Employer</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full inline-flex justify-center items-center py-2.5 px-4 text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;