import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

// Constant-time string comparison that doesn't leak length via early return.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison to keep timing roughly constant.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * HTTP Basic Auth middleware that gates the entire app.
 *
 * Credentials come from APP_USERNAME (default "admin") and APP_PASSWORD.
 * In production, if APP_PASSWORD is unset the middleware fails closed so the
 * app is never accidentally served wide open. In development, an unset
 * password disables the gate (with a warning) for convenience.
 */
export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const expectedUser = process.env.APP_USERNAME || "admin";
  const expectedPass = process.env.APP_PASSWORD;

  if (!expectedPass) {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(503)
        .json({ error: "Authentication is not configured" });
    }
    // Dev convenience: no password set means no gate.
    return next();
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);

    // Evaluate both comparisons before branching to avoid short-circuit timing leaks.
    const userOk = safeEqual(user, expectedUser);
    const passOk = safeEqual(pass, expectedPass);
    if (userOk && passOk) {
      return next();
    }
  }

  res
    .set("WWW-Authenticate", 'Basic realm="LawFirmTargeting", charset="UTF-8"')
    .status(401)
    .json({ error: "Authentication required" });
}
