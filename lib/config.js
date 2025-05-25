const config = {
  development: {
    apiUrl: 'http://localhost:5000',
  },
  production: {
    apiUrl: 'https://task-manager-lovat-six.vercel.app',
  },
};

// In Next.js, process.env.NODE_ENV is automatically set to 'production' in production builds
const env = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'development' 
  : 'production';

export const apiUrl = config[env].apiUrl; 
