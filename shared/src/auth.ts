// ==========================================================================
// Cuentas de usuario: registro con verificación por email, inicio de sesión
// y lista de juegos favoritos ligada a la cuenta (además de guardarse en el
// propio navegador, para que funcione también sin haber iniciado sesión).
// ==========================================================================

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  favorites: string[];
  createdAt: number;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
}
