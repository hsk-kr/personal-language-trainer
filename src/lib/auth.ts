import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set in .env.local");
  return secret;
}

function getPassword(): string {
  const password = process.env.AUTH_PASSWORD;
  if (!password) throw new Error("AUTH_PASSWORD not set in .env.local");
  return password;
}

export function generateSessionToken(): string {
  return createHmac("sha256", getSecret()).update("session").digest("hex");
}

export function verifyPassword(input: string): boolean {
  return input === getPassword();
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session) return false;
  return session.value === generateSessionToken();
}

export { COOKIE_NAME };
