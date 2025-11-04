import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://bago-server.onrender.com/api/Adminbaggo/AdminLogin', {
        method: 'POST', // Changed to POST to match backend
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for adminToken
        body: JSON.stringify({ username, password }), // Send credentials in body
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Assuming backend returns { message, token, admin }
      if (data.message === 'Login successful') {
        // Store token in localStorage or rely on cookie (since backend sets httpOnly cookie)
        localStorage.setItem('adminToken', data.token); // Optional, if you need token client-side
        navigate('/dashboard');
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-[#1e2749] p-3 rounded-xl">
              <span className="text-white font-bold text-lg">BZ</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Bago</h1>
          </div>
          <h2 className="text-xl text-gray-700 mb-2">Admin Dashboard</h2>
          <p className="text-gray-500">Sign in to access the admin panel</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Test credentials info */}
          // <div className="mt-6 pt-6 border-t border-gray-200">
          //   <div className="bg-gray-50 rounded-lg p-4">
          //     <h3 className="text-sm font-medium text-gray-900 mb-2">Test Credentials</h3>
          //     <div className="text-sm text-gray-600 space-y-1">
          //       // <div><strong>Username:</strong>admin</div>
          //       // <div><strong>Password:</strong>123456789</div>
          //     </div>
          //   </div>
          // </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Bago Admin Dashboard &copy; 2024
        </div>
      </div>
    </div>
  );
}
