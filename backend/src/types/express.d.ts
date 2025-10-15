// Augment Express Request to include `user` set by authMiddleware
declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}

export {};