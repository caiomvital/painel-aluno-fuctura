import { createHash } from "node:crypto";
const windowMs = 10 * 60 * 1000,
  maximum = 10,
  capacity = 10000;
const attempts = new Map<string, { count: number; reset: number }>();
const key = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
export function takeLoginAttempt(email: string, now = Date.now()) {
  for (const [id, entry] of attempts)
    if (entry.reset <= now) attempts.delete(id);
  const id = key(email);
  let entry = attempts.get(id);
  if (!entry) {
    if (attempts.size >= capacity) return false;
    entry = { count: 0, reset: now + windowMs };
    attempts.set(id, entry);
  }
  if (entry.count >= maximum) return false;
  entry.count++;
  return true;
}
export function clearLoginAttempts(email: string) {
  attempts.delete(key(email));
}
