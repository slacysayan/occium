import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    linkedinState: string;
  }
}

declare module "express" {
  interface User {
    userId: string;
  }
}
