export interface AuthContext {
  userId: string;
  email: string;
  jti?: string;
  role?: string;
  workspaceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      userId?: string;
      userJti?: string;
      requestId?: string;
    }
  }
}
