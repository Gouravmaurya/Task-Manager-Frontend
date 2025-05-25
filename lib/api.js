import { apiUrl } from './config';

// Utility function for making authenticated API requests

/**
 * Makes an authenticated API request
 * @param {string} endpoint - The API endpoint (should start with /)
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise} - The fetch promise
 */
export async function fetchWithAuth(endpoint, options = {}) {
  // Safely get token from localStorage with try/catch
  let token;
  try {
    token = localStorage.getItem('token');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    throw new Error('Could not access authentication token');
  }
  
  if (!token) {
    console.error('No authentication token found');
    // Redirect to login page or handle unauthenticated state
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  // Ensure endpoint starts with a forward slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  try {
    const response = await fetch(`${apiUrl}${normalizedEndpoint}`, {
      ...options,
      headers
    });
    
    // Handle 401 Unauthorized errors
    if (response.status === 401) {
      console.error('Authentication failed: Token may be expired');
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    
    return response;
  } catch (error) {
    console.error(`API request failed for ${normalizedEndpoint}:`, error);
    throw error;
  }
}

/**
 * Checks if the user is authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

/**
 * Gets the current user from localStorage
 * @returns {Object|null} - The user object or null if not found
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Failed to parse user data', error);
    return null;
  }
}

/**
 * Logs the user out by removing token and user data
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // You might want to redirect here or handle it in the component
}