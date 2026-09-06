import 'express-session';
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: 'student' | 'admin';
    userEmail?: string;
  }
}
