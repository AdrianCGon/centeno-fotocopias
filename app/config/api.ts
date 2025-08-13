// Configuración de APIs - Cambiar aquí para cambiar el entorno
const IS_PRODUCTION = true; // Cambiar a true para producción

// Configuración de APIs para desarrollo y producción
export const API_CONFIG = {
  // URLs base para las APIs
  BASE_URL: IS_PRODUCTION 
    ? 'http://143.198.185.191:3000' 
    : 'http://localhost:3000',
  
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