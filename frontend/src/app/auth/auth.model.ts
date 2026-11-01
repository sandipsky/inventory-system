export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

/** `GET /getUserRoleOperations`: who is signed in and what their role allows. */
export interface UserRoleOperations {
  id: number;
  username: string;
  name: string | null;
  role_id: number | null;
  role_name: string | null;
  /** Server-relative path such as `/uploads/users/<uuid>.png`; it needs the auth header to load. */
  image_url: string | null;
  master_modules: string[];
  modules: string[];
  /** Backend operation names, e.g. `ViewPurchaseEntry`, `CreatePurchaseEntry`. */
  operations: string[];
}

export interface AuthUser {
  id: number;
  /** Login handle; shown in the header when no full name is set. */
  username: string;
  fullName?: string;
  roleId?: number;
  /** Role name shown under the user's name in the profile menu. */
  role?: string;
  /** Object URL of the profile picture; absent when none is set. */
  avatarUrl?: string;
  masterModules: string[];
  operations: string[];
}
