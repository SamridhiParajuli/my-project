import api from './api'

export const login = async (username: string, password: string) => {
  try {
    // Use URLSearchParams for form data as required by FastAPI
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)
      // Store the complete response data including user, employee, and department
      localStorage.setItem('user', JSON.stringify({
        user: response.data.user,
        employee: response.data.employee,
        department: response.data.department
      }))
    }
    
    return response.data
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch (e) {
        console.error('Error parsing user data', e)
        return null
      }
    }
  }
  return null
}