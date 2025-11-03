import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

import { toast } from 'sonner'

/**
 * Flag to prevent multiple concurrent 401 redirects to login page.
 *
 * When multiple API requests fail with 401 simultaneously, each error interceptor
 * would execute window.location.href = "/login" independently, causing:
 * - Race conditions
 * - Multiple redirects (though only one takes effect)
 * - Unpredictable state changes
 *
 * Solution: Use a flag to ensure only the first 401 response triggers the redirect.
 * This flag is set to true when redirecting and never reset, as the page will
 * navigate away anyway.
 */
let isRedirectingToLogin = false

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL,
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 1000 * 60 * 60,
  maxRedirects: 0, // Disable axios automatic redirects (301, 302, etc.)
  // Let the browser handle redirects natively instead
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // console.log('Sending request:', config);
    return config
  },
  (error) => {
    // Do something with request error
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Do something with response data
    // console.log('Response data:', response)
    // upload response is not data
    if (response.status === 200 && !response.data) {
      return response
    }

    const data = response.data

    if (data.code && data.data?.redirect_url && data.code === 10001) {
      window.location.href = data.data.redirect_url
      return
    }
    if (data.code === 200) {
      return data.data
    } else {
      return Promise.reject(data.message)
    }
  },
  (error) => {
    // Do something with response error
    // console.log('Response error:', error)

    // Handle common HTTP error status codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Check if we're already redirecting to prevent race conditions
          // when multiple requests fail with 401 simultaneously
          if (!isRedirectingToLogin) {
            isRedirectingToLogin = true
            localStorage.removeItem('token')
            window.location.href = '/login'
          }
          break
        case 403:
          toast.error('No permission to access this resource')
          console.error('No permission to access this resource')
          break
        case 404:
          toast.error('Requested resource not found')
          console.error('Requested resource not found')
          break
        case 500:
          toast.error('Internal server error')
          console.error('Internal server error')
          break
        default:
          toast.error(
            'Request failed:',
            error.response.data?.message || error.message
          )
          console.error(
            'Request failed:',
            error.response.data?.message || error.message
          )
      }
    } else if (error.request) {
      toast.error('Network error, please check your connection')
      console.error('Network error, please check your connection')
    } else {
      toast.error('Request configuration error:', error.message)
      console.error('Request configuration error:', error.message)
    }

    return Promise.reject(error)
  }
)


export default axiosInstance
