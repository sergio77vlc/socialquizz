/** Registro completo de usuario, con datos sensibles — solo vive en el servidor. */
export interface StoredUser {
  id: string;
  name: string;
  /** Normalizado a minúsculas. */
  email: string;
  passwordHash: string;
  verified: boolean;
  createdAt: number;
  favorites: string[];
  pendingVerification: PendingVerification | null;
}

export interface PendingVerification {
  tokenHash: string;
  expiresAt: number;
}
