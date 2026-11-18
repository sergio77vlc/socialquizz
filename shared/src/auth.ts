// ==========================================================================
// Cuentas de usuario: registro con verificación por email, inicio de sesión
// y lista de juegos favoritos ligada a la cuenta (además de guardarse en el
// propio navegador, para que funcione también sin haber iniciado sesión).
// ==========================================================================

export type EducationLevel = 'primaria' | 'eso' | 'bachillerato' | 'fp' | 'universidad' | 'otro';

export type UserPlan = 'free' | 'premium';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  favorites: string[];
  createdAt: number;
  level: EducationLevel | null;
  plan: UserPlan;
  isAdmin: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface OnboardingPayload {
  level: EducationLevel;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
}
