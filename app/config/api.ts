// Configuración de APIs para desarrollo y producción
export const API_CONFIG = {
  // URLs base para las APIs
  // En desarrollo: localhost, en producción: servidor remoto
  BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' 
    : 'http://143.198.185.191:3000',
  
  // Endpoints específicos
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      CHECK: '/api/auth/check',
      LOGOUT: '/api/auth/logout'
    },
    SOLICITUDES: {
      BASE: '/api/solicitudes',
      BY_ID: (id: string) => `/api/solicitudes/${id}`,
      UPDATE_ESTADO: (id: string) => `/api/solicitudes/${id}/estado`
    },
    LIBROS: {
      BASE: '/api/libros',
      BY_ID: (id: string) => `/api/libros/${id}`,
      PUBLIC: '/api/libros/public'
    },
    HEALTH: '/api/health'
  }
};

// Función helper para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Función helper para obtener la URL base
export const getBaseUrl = (): string => {
  return API_CONFIG.BASE_URL;
}; 