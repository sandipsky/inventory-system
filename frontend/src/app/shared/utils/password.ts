/**
 * The rules Lumen's password checklist shows, and the API's for a new password: 8+ characters,
 * upper and lower case, a number and a symbol.
 */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
