// API configuration for different environments
const isDevelopment = import.meta.env.DEV;

// For Vercel serverless functions, use relative paths
// Vercel automatically handles routing /api/* to serverless functions
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : ''; // Empty string for production - use relative paths

export const API_ENDPOINTS = {
  GEMINI: `${API_BASE_URL}/api/gemini`,
  HEALTH: `${API_BASE_URL}/api/health`,
}; 