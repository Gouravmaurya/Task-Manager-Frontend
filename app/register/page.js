'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '../../lib/config';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [tasks, setTasks] = useState([]);

  const router = useRouter();

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateUsername = (username) => {
    if (!username) {
      setUsernameError('Username is required');
      return false;
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isUsernameValid = validateUsername(username);

    if (!isEmailValid || !isPasswordValid || !isUsernameValid) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/'); // Redirect to login page on successful registration
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message); // Set error message to display to the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-6 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-md w-full space-y-8 bg-white/5 p-6 sm:p-10 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md mx-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center">
          <div className="flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: 2 }}
              className="h-10 sm:h-12 w-10 sm:w-12 rounded-full bg-white/10 p-2 flex items-center justify-center border border-white/20">
              <Image src="/globe.svg" alt="Logo" width={24} height={24} className="sm:w-[30px] sm:h-[30px]" />
            </motion.div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create your account</h2>
          <p className="mt-2 text-sm text-gray-300">Join us to start managing your tasks</p>
        </motion.div>
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-900/40 border-l-4 border-red-500 p-4 mb-4 rounded-r shadow">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2.5 sm:py-3 border ${usernameError ? 'border-red-500' : 'border-white/20'} placeholder-gray-400 text-white bg-black/80 rounded-t-md focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 focus:z-10 text-sm sm:text-base transition-all duration-200`}
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  validateUsername(e.target.value);
                }}
                onBlur={(e) => validateUsername(e.target.value)}
              />
              {usernameError && (
                <p className="mt-1 text-sm text-red-400">{usernameError}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2.5 sm:py-3 border ${emailError ? 'border-red-500' : 'border-white/20'} placeholder-gray-400 text-white bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 focus:z-10 text-sm sm:text-base transition-all duration-200`}
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
                onBlur={(e) => validateEmail(e.target.value)}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-400">{emailError}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={`appearance-none rounded-none relative block w-full px-3 py-2.5 sm:py-3 border ${passwordError ? 'border-red-500' : 'border-white/20'} placeholder-gray-400 text-white bg-black/80 rounded-b-md focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 focus:z-10 text-sm sm:text-base transition-all duration-200`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                onBlur={(e) => validatePassword(e.target.value)}
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-400">{passwordError}</p>
              )}
            </div>
          </div>
          <div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-white/20 text-sm sm:text-base font-semibold rounded-md text-white bg-black/90 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 overflow-hidden shadow-lg">
              <motion.span 
                animate={{ x: loading ? [0, -4, 0, 4, 0] : 0 }}
                transition={{ repeat: loading ? Infinity : 0, duration: 0.5 }}
                className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-white group-hover:text-black" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </motion.span>
              {loading ? 'Creating account...' : 'Create account'}
            </motion.button>
          </div>
        </motion.form>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-sm text-center mt-6">
          <span className="text-gray-400">Already have an account?</span>{' '}
          <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
            <Link href="/" className="font-medium text-white/80 hover:text-white">
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
