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

export function getSessionToken(): string {
  return getSecret();
}

export function verifyPassword(input: string): boolean {
  return input === getPassword();
}

export { COOKIE_NAME };
