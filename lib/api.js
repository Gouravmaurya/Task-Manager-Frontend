// Utility function for making authenticated API requests

/**
 * Makes an authenticated API request
 * @param {string} url - The API endpoint
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise} - The fetch promise
 */
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
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