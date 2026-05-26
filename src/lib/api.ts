import axios from 'axios';
import { supabase, SUPABASE_ANON_KEY } from './supabase';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'https://server.matrixtwin.com/api',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    // Log token for debugging (remove in production)
    console.log('Attaching auth token:', session.access_token.substring(0, 10) + '...');
    
    config.headers.Authorization = `Bearer ${session.access_token}`;
    
    // Add dev headers for bypassing auth in development/testing
    if (import.meta.env.MODE === 'development' || true) { // Always true for now based on user request
      config.headers['dev-skip-auth'] = 'true';
      config.headers['dev-user-id'] = session.user.id;
      config.headers['dev-role'] = 'owner'; // Assuming owner role for now, can be dynamic
    }
  } else {
    console.warn('No active session found in API interceptor');
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired or unauthorized. Please login again.');
      // Optional: Redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
