// services/api.ts - Fixed API configuration with TypeScript support
import axios, { AxiosInstance } from 'axios'

// Extend AxiosInstance type to include our custom method
interface CustomAxiosInstance extends AxiosInstance {
  checkConnection: () => Promise<{ success: boolean; status?: number; message?: string }>;
}

// Set the API URL based on environment variables or fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout
  timeout: 10000,
}) as CustomAxiosInstance;

// Request interceptor for adding the auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Check if we're in a browser environment before accessing localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    
    // Log requests in development (useful for debugging)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Response: ${response.status} ${response.config.url}`)
    }
    return response
  },
  (error) => {
    // Log detailed error information
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    })
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      // Clear localStorage if token is invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// Add a method to check API connectivity
axiosInstance.checkConnection = async () => {
  try {
    const response = await axiosInstance.get('/')
    return { success: true, status: response.status }
  } catch (error: any) {
    return { 
      success: false, 
      status: error.response?.status, 
      message: error.message 
    }
  }
}

// Export the extended instance
const api = axiosInstance;
export default api