export interface AuthUser {
  /** Login handle; shown in the header when no full name is set. */
  username: string;
  fullName?: string;
  /** Role name shown under the user's name in the profile menu. */
  role?: string;
  /** Absolute or asset-relative URL of the profile picture; absent when none is set. */
  avatarUrl?: string;
}
