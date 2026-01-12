export interface User {
  id: number;
  created_at: string;
}

export interface EncryptionKeys {
  user_id: number;
  encrypted_dek: string;
  salt: string;
  public_key: string;
  private_key: string;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  importance: number;
  urgency: number;
  has_content: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithContent extends Task {
  content?: string;
}

export interface LoginChallenge {
  user_id: number;
  challenge: string;
  expires_at: string;
}

export interface Session {
  user_id: number;
  created_at: string;
  expires_at: string;
}

export interface PresignedUrl {
  url: string;
  expires_in: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  importance_min?: number;
  importance_max?: number;
  urgency_min?: number;
  urgency_max?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    has_more: boolean;
    next_cursor?: string;
  };
}