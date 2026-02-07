import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import getDb from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-wedding-2026";
const COOKIE_NAME = "admin_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: number; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<{ userId: number; email: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function ensureAdminExists() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as c FROM admin_users").get() as { c: number };
  if (count.c === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
    db.prepare("INSERT INTO admin_users (email, password_hash) VALUES (?, ?)").run(
      process.env.ADMIN_EMAIL || "admin@wedding.com",
      hash
    );
  }
}

export { COOKIE_NAME, JWT_SECRET };
