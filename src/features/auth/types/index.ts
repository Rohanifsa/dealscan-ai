export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthActionState {
  error?: string;
  success?: boolean;
}
