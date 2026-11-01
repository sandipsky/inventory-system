/** `GET /users/{id}` and the rows of `GET /users`. The password is never returned. */
export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  gender: string | null;
  contact: string | null;
  remarks: string | null;
  is_active: boolean;
  /** `null` when the user has no role, and so no permissions. */
  role_id: number | null;
  role_name: string | null;
  /** Server-relative path such as `/uploads/users/<uuid>.png`; it needs the auth header to load. */
  image_url: string | null;
}

/** Stored as free text; the seeded admin is `Other`. */
export const GENDERS = ['Male', 'Female', 'Other'];

/**
 * The `user` part of the multipart `POST /users` and `PUT /users/{id}`. On update an empty
 * `password` keeps the current one.
 */
export interface UserPayload {
  username: string;
  full_name: string;
  email: string;
  password: string;
  gender: string | null;
  contact: string | null;
  remarks: string | null;
  is_active: boolean;
  role_id: number;
}

/** How the user form was opened. `view` can switch to `edit` from inside the drawer. */
export type UserFormMode = 'add' | 'edit' | 'view';

/** Data handed to the user form through DRAWER_DATA. */
export interface UserFormData {
  mode: UserFormMode;
  /** User id; required for `edit` and `view`. */
  id?: number;
}
