
const env = import.meta.env || {}

export const baseUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'

export const wsBaseUrl = env.VITE_WS_BASE_URL || 'ws://localhost:8081'
