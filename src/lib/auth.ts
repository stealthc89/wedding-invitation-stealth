import jwt from "jsonwebtoken";
import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-wedding-2026";
const COOKIE_NAME = "admin_token";

// Comma-separated list of Gmail addresses allowed to access admin
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function createToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<{ email: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.BASE_URL || "http://localhost:3000"}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export { COOKIE_NAME };
