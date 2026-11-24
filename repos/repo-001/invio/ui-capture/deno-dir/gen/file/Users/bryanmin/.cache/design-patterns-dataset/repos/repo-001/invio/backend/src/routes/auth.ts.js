import { Hono } from "hono";
import { createJWT } from "../utils/jwt.ts";
import { verifyJWTPayload } from "../utils/jwt.ts";
import { authenticateUser, consumeUserRecoveryCodeHash, getUserById, getUserTwoFactorState } from "../controllers/users.ts";
import { decryptTwoFactorSecret, hashRecoveryCode, verifyTotpToken } from "../utils/twoFactor.ts";
import { createRateLimitResponse, getClientIp, getRateLimitConfig, isRateLimited, recordFailedAttempt, resetRateLimit } from "../middleware/rateLimiter.ts";
import { generateUUID } from "../utils/uuid.ts";
import { isDemoMode } from "../utils/env.ts";
import { buildAuthorizationUrl, exchangeAndVerify, getOidcConfig } from "../utils/oidc.ts";
import { getDatabase } from "../database/init.ts";
function getSessionTtlSeconds() {
  const parsed = parseInt(Deno.env.get("SESSION_TTL_SECONDS") || "3600", 10);
  const candidate = Number.isFinite(parsed) ? parsed : 3600;
  return Math.max(300, Math.min(60 * 60 * 12, candidate));
}
const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 5 * 60;
const DEMO_MODE = isDemoMode();
const pendingLoginChallenges = new Map();
function cleanupPendingLoginChallenges(now = Date.now()) {
  for (const [key, value] of pendingLoginChallenges.entries()){
    if (value.expiresAt <= now || value.used) {
      pendingLoginChallenges.delete(key);
    }
  }
}
async function issueSessionToken(c) {
  const sessionTtl = getSessionTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const token = await createJWT({
    userId: c.id,
    username: c.username,
    isAdmin: c.isAdmin,
    iat: now,
    exp: now + sessionTtl
  });
  return {
    token,
    expiresIn: sessionTtl
  };
}
async function issueTwoFactorChallengeToken(c) {
  cleanupPendingLoginChallenges();
  const now = Math.floor(Date.now() / 1000);
  const jti = generateUUID();
  pendingLoginChallenges.set(jti, {
    userId: c.userId,
    expiresAt: Date.now() + TWO_FACTOR_CHALLENGE_TTL_SECONDS * 1000,
    used: false
  });
  return await createJWT({
    kind: "2fa_login",
    jti,
    userId: c.userId,
    username: c.username,
    isAdmin: c.isAdmin,
    iat: now,
    exp: now + TWO_FACTOR_CHALLENGE_TTL_SECONDS
  });
}
function validateTwoFactorChallengePayload(payload) {
  if (payload.kind !== "2fa_login") {
    return {
      valid: false,
      error: "Invalid 2FA token"
    };
  }
  const jti = typeof payload.jti === "string" ? payload.jti : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  if (!jti || !userId) {
    return {
      valid: false,
      error: "Invalid 2FA token"
    };
  }
  const challenge = pendingLoginChallenges.get(jti);
  if (!challenge || challenge.userId !== userId) {
    return {
      valid: false,
      error: "Invalid or expired 2FA token"
    };
  }
  if (challenge.used || challenge.expiresAt <= Date.now()) {
    pendingLoginChallenges.delete(jti);
    return {
      valid: false,
      error: "Invalid or expired 2FA token"
    };
  }
  return {
    valid: true,
    jti,
    userId
  };
}
function markChallengeAsUsed(jti) {
  const challenge = pendingLoginChallenges.get(jti);
  if (!challenge) return;
  challenge.used = true;
  pendingLoginChallenges.set(jti, challenge);
  cleanupPendingLoginChallenges();
}
const authRoutes = new Hono();
authRoutes.post("/auth/login", async (c)=>{
  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);
  let username;
  let password;
  try {
    const body = await c.req.json();
    if (body && typeof body.username === "string" && typeof body.password === "string") {
      username = body.username;
      password = body.password;
    }
  } catch  {
  // ignore parse errors; fall through to missing credentials handling
  }
  if (!username || !password) {
    return c.json({
      error: "Missing credentials"
    }, 400);
  }
  // Check rate limit before attempting authentication
  // This checks by IP, username, and IP+username combination
  const rateLimitCheck = isRateLimited(clientIp, username);
  if (rateLimitCheck.limited) {
    return createRateLimitResponse(rateLimitCheck.retryAfter);
  }
  // Authenticate against the users table
  const user = await authenticateUser(username, password);
  if (!user) {
    // Record failed attempt for rate limiting (tracks IP, username, and combination)
    recordFailedAttempt(clientIp, username);
    return c.json({
      error: "Invalid credentials"
    }, 401);
  }
  // Successful login: reset rate limit counters
  resetRateLimit(clientIp, username);
  if (user.twoFactorEnabled && !DEMO_MODE) {
    const state = getUserTwoFactorState(user.id);
    if (!state?.enabled || !state.encryptedSecret) {
      return c.json({
        error: "2FA is enabled but not configured correctly"
      }, 500);
    }
    const challenge = await issueTwoFactorChallengeToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    });
    return c.json({
      twoFactorRequired: true,
      twoFactorToken: challenge,
      expiresIn: TWO_FACTOR_CHALLENGE_TTL_SECONDS
    });
  }
  const session = await issueSessionToken(user);
  return c.json(session);
});
authRoutes.post("/auth/verify-2fa", async (c)=>{
  if (DEMO_MODE) {
    return c.json({
      error: "2FA is not available in demo mode"
    }, 403);
  }
  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);
  let twoFactorToken;
  let token;
  try {
    const body = await c.req.json();
    if (body && typeof body.twoFactorToken === "string" && typeof body.token === "string") {
      twoFactorToken = body.twoFactorToken;
      token = body.token;
    }
  } catch  {
  // ignore parse errors
  }
  if (!twoFactorToken || !token) {
    return c.json({
      error: "Missing 2FA verification payload"
    }, 400);
  }
  const payload = await verifyJWTPayload(twoFactorToken);
  if (!payload) return c.json({
    error: "Invalid or expired 2FA token"
  }, 401);
  const parsed = validateTwoFactorChallengePayload(payload);
  if (!parsed.valid) return c.json({
    error: parsed.error
  }, 401);
  // Rate-limit by IP + userId to block brute-force of TOTP codes
  const rateLimitCheck = isRateLimited(clientIp, parsed.userId);
  if (rateLimitCheck.limited) return createRateLimitResponse(rateLimitCheck.retryAfter);
  const user = getUserById(parsed.userId);
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return c.json({
      error: "Invalid 2FA login state"
    }, 401);
  }
  const state = getUserTwoFactorState(parsed.userId);
  if (!state?.enabled || !state.encryptedSecret) {
    return c.json({
      error: "2FA is not configured for this user"
    }, 401);
  }
  const secret = await decryptTwoFactorSecret(state.encryptedSecret);
  if (!secret || !verifyTotpToken(secret, user.username, token)) {
    recordFailedAttempt(clientIp, parsed.userId);
    return c.json({
      error: "Invalid 2FA token"
    }, 401);
  }
  markChallengeAsUsed(parsed.jti);
  resetRateLimit(clientIp, parsed.userId);
  const session = await issueSessionToken(user);
  return c.json(session);
});
authRoutes.post("/auth/recover-2fa", async (c)=>{
  if (DEMO_MODE) {
    return c.json({
      error: "2FA is not available in demo mode"
    }, 403);
  }
  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);
  let twoFactorToken;
  let recoveryCode;
  try {
    const body = await c.req.json();
    if (body && typeof body.twoFactorToken === "string" && typeof body.recoveryCode === "string") {
      twoFactorToken = body.twoFactorToken;
      recoveryCode = body.recoveryCode;
    }
  } catch  {
  // ignore parse errors
  }
  if (!twoFactorToken || !recoveryCode) {
    return c.json({
      error: "Missing 2FA recovery payload"
    }, 400);
  }
  const payload = await verifyJWTPayload(twoFactorToken);
  if (!payload) return c.json({
    error: "Invalid or expired 2FA token"
  }, 401);
  const parsed = validateTwoFactorChallengePayload(payload);
  if (!parsed.valid) return c.json({
    error: parsed.error
  }, 401);
  // Rate-limit by IP + userId to block brute-force of recovery codes
  const rateLimitCheck = isRateLimited(clientIp, parsed.userId);
  if (rateLimitCheck.limited) return createRateLimitResponse(rateLimitCheck.retryAfter);
  const user = getUserById(parsed.userId);
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return c.json({
      error: "Invalid 2FA login state"
    }, 401);
  }
  const recoveryHash = await hashRecoveryCode(recoveryCode);
  const consumed = consumeUserRecoveryCodeHash(parsed.userId, recoveryHash);
  if (!consumed) {
    recordFailedAttempt(clientIp, parsed.userId);
    return c.json({
      error: "Invalid recovery code"
    }, 401);
  }
  markChallengeAsUsed(parsed.jti);
  resetRateLimit(clientIp, parsed.userId);
  const session = await issueSessionToken(user);
  return c.json(session);
});
authRoutes.get("/auth/oidc/authorize", async (c)=>{
  const oidc = getOidcConfig();
  if (!oidc.enabled) return c.json({
    error: "OIDC not enabled"
  }, 404);
  try {
    const url = await buildAuthorizationUrl();
    return c.json({
      url
    });
  } catch (err) {
    console.error("OIDC authorize error:", err);
    return c.json({
      error: "Failed to build authorization URL"
    }, 500);
  }
});
authRoutes.post("/auth/oidc/callback", async (c)=>{
  const oidc = getOidcConfig();
  if (!oidc.enabled) return c.json({
    error: "OIDC not enabled"
  }, 404);
  let code;
  let state;
  try {
    const body = await c.req.json();
    code = typeof body.code === "string" ? body.code : undefined;
    state = typeof body.state === "string" ? body.state : undefined;
  } catch  {
    return c.json({
      error: "Invalid request body"
    }, 400);
  }
  if (!code || !state) return c.json({
    error: "Missing code or state"
  }, 400);
  let claims;
  try {
    claims = await exchangeAndVerify(code, state);
  } catch (err) {
    console.error("OIDC callback error:", err);
    return c.json({
      error: "OIDC verification failed"
    }, 401);
  }
  const db = getDatabase();
  // 1. Look up by oidc_subject
  let rows = db.query("SELECT id, username, is_admin, is_active FROM users WHERE oidc_subject = ?", [
    claims.sub
  ]);
  // 2. Look up by email and bind oidc_subject
  if (rows.length === 0 && claims.email) {
    rows = db.query("SELECT id, username, is_admin, is_active FROM users WHERE email = ?", [
      claims.email
    ]);
    if (rows.length > 0) {
      db.query("UPDATE users SET oidc_subject = ?, updated_at = ? WHERE id = ?", [
        claims.sub,
        new Date().toISOString(),
        String(rows[0][0])
      ]);
    }
  }
  // 3. Auto-provision a new user
  if (rows.length === 0) {
    if (!oidc.autoProvision) {
      return c.json({
        error: "No matching Invio account. Contact an administrator."
      }, 403);
    }
    const baseUsername = (claims.preferred_username || claims.name || claims.sub).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
    let username = baseUsername;
    let attempt = 0;
    while(db.query("SELECT id FROM users WHERE username = ?", [
      username
    ]).length > 0){
      attempt++;
      username = `${baseUsername}_${attempt}`;
    }
    const id = generateUUID();
    const now = new Date().toISOString();
    db.query(`INSERT INTO users (id, username, email, display_name, password_hash, is_admin, is_active, oidc_subject, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'oidc:no-password', 0, 1, ?, ?, ?)`, [
      id,
      username,
      claims.email || null,
      claims.name || null,
      claims.sub,
      now,
      now
    ]);
    rows = db.query("SELECT id, username, is_admin, is_active FROM users WHERE id = ?", [
      id
    ]);
  }
  const row = rows[0];
  const userId = String(row[0]);
  const username = String(row[1]);
  const isAdmin = Boolean(row[2]);
  const isActive = Boolean(row[3]);
  if (!isActive) {
    return c.json({
      error: "Account is disabled"
    }, 403);
  }
  const session = await issueSessionToken({
    id: userId,
    username,
    isAdmin
  });
  return c.json(session);
});
export { authRoutes };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvYnJ5YW5taW4vLmNhY2hlL2Rlc2lnbi1wYXR0ZXJucy1kYXRhc2V0L3JlcG9zL3JlcG8tMDAxL2ludmlvL2JhY2tlbmQvc3JjL3JvdXRlcy9hdXRoLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhvbm8gfSBmcm9tIFwiaG9ub1wiO1xuaW1wb3J0IHsgY3JlYXRlSldUIH0gZnJvbSBcIi4uL3V0aWxzL2p3dC50c1wiO1xuaW1wb3J0IHsgdmVyaWZ5SldUUGF5bG9hZCB9IGZyb20gXCIuLi91dGlscy9qd3QudHNcIjtcbmltcG9ydCB7XG4gIGF1dGhlbnRpY2F0ZVVzZXIsXG4gIGNvbnN1bWVVc2VyUmVjb3ZlcnlDb2RlSGFzaCxcbiAgZ2V0VXNlckJ5SWQsXG4gIGdldFVzZXJUd29GYWN0b3JTdGF0ZSxcbn0gZnJvbSBcIi4uL2NvbnRyb2xsZXJzL3VzZXJzLnRzXCI7XG5pbXBvcnQge1xuICBkZWNyeXB0VHdvRmFjdG9yU2VjcmV0LFxuICBoYXNoUmVjb3ZlcnlDb2RlLFxuICB2ZXJpZnlUb3RwVG9rZW4sXG59IGZyb20gXCIuLi91dGlscy90d29GYWN0b3IudHNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZVJhdGVMaW1pdFJlc3BvbnNlLFxuICBnZXRDbGllbnRJcCxcbiAgZ2V0UmF0ZUxpbWl0Q29uZmlnLFxuICBpc1JhdGVMaW1pdGVkLFxuICByZWNvcmRGYWlsZWRBdHRlbXB0LFxuICByZXNldFJhdGVMaW1pdCxcbn0gZnJvbSBcIi4uL21pZGRsZXdhcmUvcmF0ZUxpbWl0ZXIudHNcIjtcbmltcG9ydCB7IGdlbmVyYXRlVVVJRCB9IGZyb20gXCIuLi91dGlscy91dWlkLnRzXCI7XG5pbXBvcnQgeyBpc0RlbW9Nb2RlIH0gZnJvbSBcIi4uL3V0aWxzL2Vudi50c1wiO1xuaW1wb3J0IHtcbiAgYnVpbGRBdXRob3JpemF0aW9uVXJsLFxuICBleGNoYW5nZUFuZFZlcmlmeSxcbiAgZ2V0T2lkY0NvbmZpZyxcbiAgdHlwZSBPaWRjQ2xhaW1zLFxufSBmcm9tIFwiLi4vdXRpbHMvb2lkYy50c1wiO1xuaW1wb3J0IHsgZ2V0RGF0YWJhc2UgfSBmcm9tIFwiLi4vZGF0YWJhc2UvaW5pdC50c1wiO1xuXG5mdW5jdGlvbiBnZXRTZXNzaW9uVHRsU2Vjb25kcygpOiBudW1iZXIge1xuICBjb25zdCBwYXJzZWQgPSBwYXJzZUludChEZW5vLmVudi5nZXQoXCJTRVNTSU9OX1RUTF9TRUNPTkRTXCIpIHx8IFwiMzYwMFwiLCAxMCk7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IE51bWJlci5pc0Zpbml0ZShwYXJzZWQpID8gcGFyc2VkIDogMzYwMDtcbiAgcmV0dXJuIE1hdGgubWF4KDMwMCwgTWF0aC5taW4oNjAgKiA2MCAqIDEyLCBjYW5kaWRhdGUpKTtcbn1cblxuY29uc3QgVFdPX0ZBQ1RPUl9DSEFMTEVOR0VfVFRMX1NFQ09ORFMgPSA1ICogNjA7XG5jb25zdCBERU1PX01PREUgPSBpc0RlbW9Nb2RlKCk7XG5cbnR5cGUgUGVuZGluZ0xvZ2luQ2hhbGxlbmdlID0ge1xuICB1c2VySWQ6IHN0cmluZztcbiAgZXhwaXJlc0F0OiBudW1iZXI7XG4gIHVzZWQ6IGJvb2xlYW47XG59O1xuXG5jb25zdCBwZW5kaW5nTG9naW5DaGFsbGVuZ2VzID0gbmV3IE1hcDxzdHJpbmcsIFBlbmRpbmdMb2dpbkNoYWxsZW5nZT4oKTtcblxuZnVuY3Rpb24gY2xlYW51cFBlbmRpbmdMb2dpbkNoYWxsZW5nZXMobm93ID0gRGF0ZS5ub3coKSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwZW5kaW5nTG9naW5DaGFsbGVuZ2VzLmVudHJpZXMoKSkge1xuICAgIGlmICh2YWx1ZS5leHBpcmVzQXQgPD0gbm93IHx8IHZhbHVlLnVzZWQpIHtcbiAgICAgIHBlbmRpbmdMb2dpbkNoYWxsZW5nZXMuZGVsZXRlKGtleSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGlzc3VlU2Vzc2lvblRva2VuKGM6IHtcbiAgaWQ6IHN0cmluZztcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn0pIHtcbiAgY29uc3Qgc2Vzc2lvblR0bCA9IGdldFNlc3Npb25UdGxTZWNvbmRzKCk7XG4gIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICBjb25zdCB0b2tlbiA9IGF3YWl0IGNyZWF0ZUpXVCh7XG4gICAgdXNlcklkOiBjLmlkLFxuICAgIHVzZXJuYW1lOiBjLnVzZXJuYW1lLFxuICAgIGlzQWRtaW46IGMuaXNBZG1pbixcbiAgICBpYXQ6IG5vdyxcbiAgICBleHA6IG5vdyArIHNlc3Npb25UdGwsXG4gIH0pO1xuICByZXR1cm4geyB0b2tlbiwgZXhwaXJlc0luOiBzZXNzaW9uVHRsIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGlzc3VlVHdvRmFjdG9yQ2hhbGxlbmdlVG9rZW4oYzoge1xuICB1c2VySWQ6IHN0cmluZztcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn0pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjbGVhbnVwUGVuZGluZ0xvZ2luQ2hhbGxlbmdlcygpO1xuICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgY29uc3QganRpID0gZ2VuZXJhdGVVVUlEKCk7XG4gIHBlbmRpbmdMb2dpbkNoYWxsZW5nZXMuc2V0KGp0aSwge1xuICAgIHVzZXJJZDogYy51c2VySWQsXG4gICAgZXhwaXJlc0F0OiBEYXRlLm5vdygpICsgVFdPX0ZBQ1RPUl9DSEFMTEVOR0VfVFRMX1NFQ09ORFMgKiAxMDAwLFxuICAgIHVzZWQ6IGZhbHNlLFxuICB9KTtcbiAgcmV0dXJuIGF3YWl0IGNyZWF0ZUpXVCh7XG4gICAga2luZDogXCIyZmFfbG9naW5cIixcbiAgICBqdGksXG4gICAgdXNlcklkOiBjLnVzZXJJZCxcbiAgICB1c2VybmFtZTogYy51c2VybmFtZSxcbiAgICBpc0FkbWluOiBjLmlzQWRtaW4sXG4gICAgaWF0OiBub3csXG4gICAgZXhwOiBub3cgKyBUV09fRkFDVE9SX0NIQUxMRU5HRV9UVExfU0VDT05EUyxcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlVHdvRmFjdG9yQ2hhbGxlbmdlUGF5bG9hZChwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6XG4gIHwgeyB2YWxpZDogdHJ1ZTsganRpOiBzdHJpbmc7IHVzZXJJZDogc3RyaW5nIH1cbiAgfCB7XG4gICAgICB2YWxpZDogZmFsc2U7XG4gICAgICBlcnJvcjogc3RyaW5nO1xuICAgIH0ge1xuICBpZiAocGF5bG9hZC5raW5kICE9PSBcIjJmYV9sb2dpblwiKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJJbnZhbGlkIDJGQSB0b2tlblwiIH07XG4gIH1cbiAgY29uc3QganRpID0gdHlwZW9mIHBheWxvYWQuanRpID09PSBcInN0cmluZ1wiID8gcGF5bG9hZC5qdGkgOiBcIlwiO1xuICBjb25zdCB1c2VySWQgPSB0eXBlb2YgcGF5bG9hZC51c2VySWQgPT09IFwic3RyaW5nXCIgPyBwYXlsb2FkLnVzZXJJZCA6IFwiXCI7XG4gIGlmICghanRpIHx8ICF1c2VySWQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiBcIkludmFsaWQgMkZBIHRva2VuXCIgfTtcbiAgfVxuICBjb25zdCBjaGFsbGVuZ2UgPSBwZW5kaW5nTG9naW5DaGFsbGVuZ2VzLmdldChqdGkpO1xuICBpZiAoIWNoYWxsZW5nZSB8fCBjaGFsbGVuZ2UudXNlcklkICE9PSB1c2VySWQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiBcIkludmFsaWQgb3IgZXhwaXJlZCAyRkEgdG9rZW5cIiB9O1xuICB9XG4gIGlmIChjaGFsbGVuZ2UudXNlZCB8fCBjaGFsbGVuZ2UuZXhwaXJlc0F0IDw9IERhdGUubm93KCkpIHtcbiAgICBwZW5kaW5nTG9naW5DaGFsbGVuZ2VzLmRlbGV0ZShqdGkpO1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgZXJyb3I6IFwiSW52YWxpZCBvciBleHBpcmVkIDJGQSB0b2tlblwiIH07XG4gIH1cbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGp0aSwgdXNlcklkIH07XG59XG5cbmZ1bmN0aW9uIG1hcmtDaGFsbGVuZ2VBc1VzZWQoanRpOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY2hhbGxlbmdlID0gcGVuZGluZ0xvZ2luQ2hhbGxlbmdlcy5nZXQoanRpKTtcbiAgaWYgKCFjaGFsbGVuZ2UpIHJldHVybjtcbiAgY2hhbGxlbmdlLnVzZWQgPSB0cnVlO1xuICBwZW5kaW5nTG9naW5DaGFsbGVuZ2VzLnNldChqdGksIGNoYWxsZW5nZSk7XG4gIGNsZWFudXBQZW5kaW5nTG9naW5DaGFsbGVuZ2VzKCk7XG59XG5cbmNvbnN0IGF1dGhSb3V0ZXMgPSBuZXcgSG9ubygpO1xuXG5hdXRoUm91dGVzLnBvc3QoXCIvYXV0aC9sb2dpblwiLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBjb25maWcgPSBnZXRSYXRlTGltaXRDb25maWcoKTtcbiAgY29uc3QgY2xpZW50SXAgPSBnZXRDbGllbnRJcChjLnJlcS5yYXcuaGVhZGVycywgY29uZmlnLnRydXN0UHJveHkpO1xuXG4gIGxldCB1c2VybmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgcGFzc3dvcmQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgaWYgKFxuICAgICAgYm9keSAmJlxuICAgICAgdHlwZW9mIGJvZHkudXNlcm5hbWUgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgIHR5cGVvZiBib2R5LnBhc3N3b3JkID09PSBcInN0cmluZ1wiXG4gICAgKSB7XG4gICAgICB1c2VybmFtZSA9IGJvZHkudXNlcm5hbWU7XG4gICAgICBwYXNzd29yZCA9IGJvZHkucGFzc3dvcmQ7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgcGFyc2UgZXJyb3JzOyBmYWxsIHRocm91Z2ggdG8gbWlzc2luZyBjcmVkZW50aWFscyBoYW5kbGluZ1xuICB9XG5cbiAgaWYgKCF1c2VybmFtZSB8fCAhcGFzc3dvcmQpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTWlzc2luZyBjcmVkZW50aWFsc1wiIH0sIDQwMCk7XG4gIH1cblxuICAvLyBDaGVjayByYXRlIGxpbWl0IGJlZm9yZSBhdHRlbXB0aW5nIGF1dGhlbnRpY2F0aW9uXG4gIC8vIFRoaXMgY2hlY2tzIGJ5IElQLCB1c2VybmFtZSwgYW5kIElQK3VzZXJuYW1lIGNvbWJpbmF0aW9uXG4gIGNvbnN0IHJhdGVMaW1pdENoZWNrID0gaXNSYXRlTGltaXRlZChjbGllbnRJcCwgdXNlcm5hbWUpO1xuICBpZiAocmF0ZUxpbWl0Q2hlY2subGltaXRlZCkge1xuICAgIHJldHVybiBjcmVhdGVSYXRlTGltaXRSZXNwb25zZShyYXRlTGltaXRDaGVjay5yZXRyeUFmdGVyKTtcbiAgfVxuXG4gIC8vIEF1dGhlbnRpY2F0ZSBhZ2FpbnN0IHRoZSB1c2VycyB0YWJsZVxuICBjb25zdCB1c2VyID0gYXdhaXQgYXV0aGVudGljYXRlVXNlcih1c2VybmFtZSwgcGFzc3dvcmQpO1xuICBpZiAoIXVzZXIpIHtcbiAgICAvLyBSZWNvcmQgZmFpbGVkIGF0dGVtcHQgZm9yIHJhdGUgbGltaXRpbmcgKHRyYWNrcyBJUCwgdXNlcm5hbWUsIGFuZCBjb21iaW5hdGlvbilcbiAgICByZWNvcmRGYWlsZWRBdHRlbXB0KGNsaWVudElwLCB1c2VybmFtZSk7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkludmFsaWQgY3JlZGVudGlhbHNcIiB9LCA0MDEpO1xuICB9XG5cbiAgLy8gU3VjY2Vzc2Z1bCBsb2dpbjogcmVzZXQgcmF0ZSBsaW1pdCBjb3VudGVyc1xuICByZXNldFJhdGVMaW1pdChjbGllbnRJcCwgdXNlcm5hbWUpO1xuXG4gIGlmICh1c2VyLnR3b0ZhY3RvckVuYWJsZWQgJiYgIURFTU9fTU9ERSkge1xuICAgIGNvbnN0IHN0YXRlID0gZ2V0VXNlclR3b0ZhY3RvclN0YXRlKHVzZXIuaWQpO1xuICAgIGlmICghc3RhdGU/LmVuYWJsZWQgfHwgIXN0YXRlLmVuY3J5cHRlZFNlY3JldCkge1xuICAgICAgcmV0dXJuIGMuanNvbihcbiAgICAgICAgeyBlcnJvcjogXCIyRkEgaXMgZW5hYmxlZCBidXQgbm90IGNvbmZpZ3VyZWQgY29ycmVjdGx5XCIgfSxcbiAgICAgICAgNTAwLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgY2hhbGxlbmdlID0gYXdhaXQgaXNzdWVUd29GYWN0b3JDaGFsbGVuZ2VUb2tlbih7XG4gICAgICB1c2VySWQ6IHVzZXIuaWQsXG4gICAgICB1c2VybmFtZTogdXNlci51c2VybmFtZSxcbiAgICAgIGlzQWRtaW46IHVzZXIuaXNBZG1pbixcbiAgICB9KTtcbiAgICByZXR1cm4gYy5qc29uKHtcbiAgICAgIHR3b0ZhY3RvclJlcXVpcmVkOiB0cnVlLFxuICAgICAgdHdvRmFjdG9yVG9rZW46IGNoYWxsZW5nZSxcbiAgICAgIGV4cGlyZXNJbjogVFdPX0ZBQ1RPUl9DSEFMTEVOR0VfVFRMX1NFQ09ORFMsXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgaXNzdWVTZXNzaW9uVG9rZW4odXNlcik7XG4gIHJldHVybiBjLmpzb24oc2Vzc2lvbik7XG59KTtcblxuYXV0aFJvdXRlcy5wb3N0KFwiL2F1dGgvdmVyaWZ5LTJmYVwiLCBhc3luYyAoYykgPT4ge1xuICBpZiAoREVNT19NT0RFKSB7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIjJGQSBpcyBub3QgYXZhaWxhYmxlIGluIGRlbW8gbW9kZVwiIH0sIDQwMyk7XG4gIH1cblxuICBjb25zdCBjb25maWcgPSBnZXRSYXRlTGltaXRDb25maWcoKTtcbiAgY29uc3QgY2xpZW50SXAgPSBnZXRDbGllbnRJcChjLnJlcS5yYXcuaGVhZGVycywgY29uZmlnLnRydXN0UHJveHkpO1xuXG4gIGxldCB0d29GYWN0b3JUb2tlbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgdG9rZW46IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgYy5yZXEuanNvbigpO1xuICAgIGlmIChcbiAgICAgIGJvZHkgJiZcbiAgICAgIHR5cGVvZiBib2R5LnR3b0ZhY3RvclRva2VuID09PSBcInN0cmluZ1wiICYmXG4gICAgICB0eXBlb2YgYm9keS50b2tlbiA9PT0gXCJzdHJpbmdcIlxuICAgICkge1xuICAgICAgdHdvRmFjdG9yVG9rZW4gPSBib2R5LnR3b0ZhY3RvclRva2VuO1xuICAgICAgdG9rZW4gPSBib2R5LnRva2VuO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gaWdub3JlIHBhcnNlIGVycm9yc1xuICB9XG5cbiAgaWYgKCF0d29GYWN0b3JUb2tlbiB8fCAhdG9rZW4pIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTWlzc2luZyAyRkEgdmVyaWZpY2F0aW9uIHBheWxvYWRcIiB9LCA0MDApO1xuICB9XG5cbiAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHZlcmlmeUpXVFBheWxvYWQodHdvRmFjdG9yVG9rZW4pO1xuICBpZiAoIXBheWxvYWQpIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJJbnZhbGlkIG9yIGV4cGlyZWQgMkZBIHRva2VuXCIgfSwgNDAxKTtcblxuICBjb25zdCBwYXJzZWQgPSB2YWxpZGF0ZVR3b0ZhY3RvckNoYWxsZW5nZVBheWxvYWQocGF5bG9hZCk7XG4gIGlmICghcGFyc2VkLnZhbGlkKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IHBhcnNlZC5lcnJvciB9LCA0MDEpO1xuXG4gIC8vIFJhdGUtbGltaXQgYnkgSVAgKyB1c2VySWQgdG8gYmxvY2sgYnJ1dGUtZm9yY2Ugb2YgVE9UUCBjb2Rlc1xuICBjb25zdCByYXRlTGltaXRDaGVjayA9IGlzUmF0ZUxpbWl0ZWQoY2xpZW50SXAsIHBhcnNlZC51c2VySWQpO1xuICBpZiAocmF0ZUxpbWl0Q2hlY2subGltaXRlZClcbiAgICByZXR1cm4gY3JlYXRlUmF0ZUxpbWl0UmVzcG9uc2UocmF0ZUxpbWl0Q2hlY2sucmV0cnlBZnRlcik7XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHBhcnNlZC51c2VySWQpO1xuICBpZiAoIXVzZXIgfHwgIXVzZXIuaXNBY3RpdmUgfHwgIXVzZXIudHdvRmFjdG9yRW5hYmxlZCkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJJbnZhbGlkIDJGQSBsb2dpbiBzdGF0ZVwiIH0sIDQwMSk7XG4gIH1cbiAgY29uc3Qgc3RhdGUgPSBnZXRVc2VyVHdvRmFjdG9yU3RhdGUocGFyc2VkLnVzZXJJZCk7XG4gIGlmICghc3RhdGU/LmVuYWJsZWQgfHwgIXN0YXRlLmVuY3J5cHRlZFNlY3JldCkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCIyRkEgaXMgbm90IGNvbmZpZ3VyZWQgZm9yIHRoaXMgdXNlclwiIH0sIDQwMSk7XG4gIH1cblxuICBjb25zdCBzZWNyZXQgPSBhd2FpdCBkZWNyeXB0VHdvRmFjdG9yU2VjcmV0KHN0YXRlLmVuY3J5cHRlZFNlY3JldCk7XG4gIGlmICghc2VjcmV0IHx8ICF2ZXJpZnlUb3RwVG9rZW4oc2VjcmV0LCB1c2VyLnVzZXJuYW1lLCB0b2tlbikpIHtcbiAgICByZWNvcmRGYWlsZWRBdHRlbXB0KGNsaWVudElwLCBwYXJzZWQudXNlcklkKTtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiSW52YWxpZCAyRkEgdG9rZW5cIiB9LCA0MDEpO1xuICB9XG5cbiAgbWFya0NoYWxsZW5nZUFzVXNlZChwYXJzZWQuanRpKTtcbiAgcmVzZXRSYXRlTGltaXQoY2xpZW50SXAsIHBhcnNlZC51c2VySWQpO1xuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgaXNzdWVTZXNzaW9uVG9rZW4odXNlcik7XG4gIHJldHVybiBjLmpzb24oc2Vzc2lvbik7XG59KTtcblxuYXV0aFJvdXRlcy5wb3N0KFwiL2F1dGgvcmVjb3Zlci0yZmFcIiwgYXN5bmMgKGMpID0+IHtcbiAgaWYgKERFTU9fTU9ERSkge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCIyRkEgaXMgbm90IGF2YWlsYWJsZSBpbiBkZW1vIG1vZGVcIiB9LCA0MDMpO1xuICB9XG5cbiAgY29uc3QgY29uZmlnID0gZ2V0UmF0ZUxpbWl0Q29uZmlnKCk7XG4gIGNvbnN0IGNsaWVudElwID0gZ2V0Q2xpZW50SXAoYy5yZXEucmF3LmhlYWRlcnMsIGNvbmZpZy50cnVzdFByb3h5KTtcblxuICBsZXQgdHdvRmFjdG9yVG9rZW46IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IHJlY292ZXJ5Q29kZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgaWYgKFxuICAgICAgYm9keSAmJlxuICAgICAgdHlwZW9mIGJvZHkudHdvRmFjdG9yVG9rZW4gPT09IFwic3RyaW5nXCIgJiZcbiAgICAgIHR5cGVvZiBib2R5LnJlY292ZXJ5Q29kZSA9PT0gXCJzdHJpbmdcIlxuICAgICkge1xuICAgICAgdHdvRmFjdG9yVG9rZW4gPSBib2R5LnR3b0ZhY3RvclRva2VuO1xuICAgICAgcmVjb3ZlcnlDb2RlID0gYm9keS5yZWNvdmVyeUNvZGU7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgcGFyc2UgZXJyb3JzXG4gIH1cblxuICBpZiAoIXR3b0ZhY3RvclRva2VuIHx8ICFyZWNvdmVyeUNvZGUpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTWlzc2luZyAyRkEgcmVjb3ZlcnkgcGF5bG9hZFwiIH0sIDQwMCk7XG4gIH1cblxuICBjb25zdCBwYXlsb2FkID0gYXdhaXQgdmVyaWZ5SldUUGF5bG9hZCh0d29GYWN0b3JUb2tlbik7XG4gIGlmICghcGF5bG9hZCkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkludmFsaWQgb3IgZXhwaXJlZCAyRkEgdG9rZW5cIiB9LCA0MDEpO1xuICBjb25zdCBwYXJzZWQgPSB2YWxpZGF0ZVR3b0ZhY3RvckNoYWxsZW5nZVBheWxvYWQocGF5bG9hZCk7XG4gIGlmICghcGFyc2VkLnZhbGlkKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IHBhcnNlZC5lcnJvciB9LCA0MDEpO1xuXG4gIC8vIFJhdGUtbGltaXQgYnkgSVAgKyB1c2VySWQgdG8gYmxvY2sgYnJ1dGUtZm9yY2Ugb2YgcmVjb3ZlcnkgY29kZXNcbiAgY29uc3QgcmF0ZUxpbWl0Q2hlY2sgPSBpc1JhdGVMaW1pdGVkKGNsaWVudElwLCBwYXJzZWQudXNlcklkKTtcbiAgaWYgKHJhdGVMaW1pdENoZWNrLmxpbWl0ZWQpXG4gICAgcmV0dXJuIGNyZWF0ZVJhdGVMaW1pdFJlc3BvbnNlKHJhdGVMaW1pdENoZWNrLnJldHJ5QWZ0ZXIpO1xuXG4gIGNvbnN0IHVzZXIgPSBnZXRVc2VyQnlJZChwYXJzZWQudXNlcklkKTtcbiAgaWYgKCF1c2VyIHx8ICF1c2VyLmlzQWN0aXZlIHx8ICF1c2VyLnR3b0ZhY3RvckVuYWJsZWQpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiSW52YWxpZCAyRkEgbG9naW4gc3RhdGVcIiB9LCA0MDEpO1xuICB9XG5cbiAgY29uc3QgcmVjb3ZlcnlIYXNoID0gYXdhaXQgaGFzaFJlY292ZXJ5Q29kZShyZWNvdmVyeUNvZGUpO1xuICBjb25zdCBjb25zdW1lZCA9IGNvbnN1bWVVc2VyUmVjb3ZlcnlDb2RlSGFzaChwYXJzZWQudXNlcklkLCByZWNvdmVyeUhhc2gpO1xuICBpZiAoIWNvbnN1bWVkKSB7XG4gICAgcmVjb3JkRmFpbGVkQXR0ZW1wdChjbGllbnRJcCwgcGFyc2VkLnVzZXJJZCk7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIkludmFsaWQgcmVjb3ZlcnkgY29kZVwiIH0sIDQwMSk7XG4gIH1cblxuICBtYXJrQ2hhbGxlbmdlQXNVc2VkKHBhcnNlZC5qdGkpO1xuICByZXNldFJhdGVMaW1pdChjbGllbnRJcCwgcGFyc2VkLnVzZXJJZCk7XG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBpc3N1ZVNlc3Npb25Ub2tlbih1c2VyKTtcbiAgcmV0dXJuIGMuanNvbihzZXNzaW9uKTtcbn0pO1xuXG5hdXRoUm91dGVzLmdldChcIi9hdXRoL29pZGMvYXV0aG9yaXplXCIsIGFzeW5jIChjKSA9PiB7XG4gIGNvbnN0IG9pZGMgPSBnZXRPaWRjQ29uZmlnKCk7XG4gIGlmICghb2lkYy5lbmFibGVkKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiT0lEQyBub3QgZW5hYmxlZFwiIH0sIDQwNCk7XG4gIHRyeSB7XG4gICAgY29uc3QgdXJsID0gYXdhaXQgYnVpbGRBdXRob3JpemF0aW9uVXJsKCk7XG4gICAgcmV0dXJuIGMuanNvbih7IHVybCB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIk9JREMgYXV0aG9yaXplIGVycm9yOlwiLCBlcnIpO1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJGYWlsZWQgdG8gYnVpbGQgYXV0aG9yaXphdGlvbiBVUkxcIiB9LCA1MDApO1xuICB9XG59KTtcblxuYXV0aFJvdXRlcy5wb3N0KFwiL2F1dGgvb2lkYy9jYWxsYmFja1wiLCBhc3luYyAoYykgPT4ge1xuICBjb25zdCBvaWRjID0gZ2V0T2lkY0NvbmZpZygpO1xuICBpZiAoIW9pZGMuZW5hYmxlZCkgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk9JREMgbm90IGVuYWJsZWRcIiB9LCA0MDQpO1xuXG4gIGxldCBjb2RlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBzdGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCBjLnJlcS5qc29uKCk7XG4gICAgY29kZSA9IHR5cGVvZiBib2R5LmNvZGUgPT09IFwic3RyaW5nXCIgPyBib2R5LmNvZGUgOiB1bmRlZmluZWQ7XG4gICAgc3RhdGUgPSB0eXBlb2YgYm9keS5zdGF0ZSA9PT0gXCJzdHJpbmdcIiA/IGJvZHkuc3RhdGUgOiB1bmRlZmluZWQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBjLmpzb24oeyBlcnJvcjogXCJJbnZhbGlkIHJlcXVlc3QgYm9keVwiIH0sIDQwMCk7XG4gIH1cblxuICBpZiAoIWNvZGUgfHwgIXN0YXRlKSByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiTWlzc2luZyBjb2RlIG9yIHN0YXRlXCIgfSwgNDAwKTtcblxuICBsZXQgY2xhaW1zOiBPaWRjQ2xhaW1zO1xuICB0cnkge1xuICAgIGNsYWltcyA9IGF3YWl0IGV4Y2hhbmdlQW5kVmVyaWZ5KGNvZGUsIHN0YXRlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIk9JREMgY2FsbGJhY2sgZXJyb3I6XCIsIGVycik7XG4gICAgcmV0dXJuIGMuanNvbih7IGVycm9yOiBcIk9JREMgdmVyaWZpY2F0aW9uIGZhaWxlZFwiIH0sIDQwMSk7XG4gIH1cblxuICBjb25zdCBkYiA9IGdldERhdGFiYXNlKCk7XG5cbiAgLy8gMS4gTG9vayB1cCBieSBvaWRjX3N1YmplY3RcbiAgbGV0IHJvd3MgPSBkYi5xdWVyeShcbiAgICBcIlNFTEVDVCBpZCwgdXNlcm5hbWUsIGlzX2FkbWluLCBpc19hY3RpdmUgRlJPTSB1c2VycyBXSEVSRSBvaWRjX3N1YmplY3QgPSA/XCIsXG4gICAgW2NsYWltcy5zdWJdLFxuICApIGFzIHVua25vd25bXVtdO1xuXG4gIC8vIDIuIExvb2sgdXAgYnkgZW1haWwgYW5kIGJpbmQgb2lkY19zdWJqZWN0XG4gIGlmIChyb3dzLmxlbmd0aCA9PT0gMCAmJiBjbGFpbXMuZW1haWwpIHtcbiAgICByb3dzID0gZGIucXVlcnkoXG4gICAgICBcIlNFTEVDVCBpZCwgdXNlcm5hbWUsIGlzX2FkbWluLCBpc19hY3RpdmUgRlJPTSB1c2VycyBXSEVSRSBlbWFpbCA9ID9cIixcbiAgICAgIFtjbGFpbXMuZW1haWxdLFxuICAgICkgYXMgdW5rbm93bltdW107XG4gICAgaWYgKHJvd3MubGVuZ3RoID4gMCkge1xuICAgICAgZGIucXVlcnkoXG4gICAgICAgIFwiVVBEQVRFIHVzZXJzIFNFVCBvaWRjX3N1YmplY3QgPSA/LCB1cGRhdGVkX2F0ID0gPyBXSEVSRSBpZCA9ID9cIixcbiAgICAgICAgW2NsYWltcy5zdWIsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSwgU3RyaW5nKChyb3dzWzBdIGFzIHVua25vd25bXSlbMF0pXSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gMy4gQXV0by1wcm92aXNpb24gYSBuZXcgdXNlclxuICBpZiAocm93cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoIW9pZGMuYXV0b1Byb3Zpc2lvbikge1xuICAgICAgcmV0dXJuIGMuanNvbihcbiAgICAgICAgeyBlcnJvcjogXCJObyBtYXRjaGluZyBJbnZpbyBhY2NvdW50LiBDb250YWN0IGFuIGFkbWluaXN0cmF0b3IuXCIgfSxcbiAgICAgICAgNDAzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlVXNlcm5hbWUgPSAoXG4gICAgICBjbGFpbXMucHJlZmVycmVkX3VzZXJuYW1lIHx8IGNsYWltcy5uYW1lIHx8IGNsYWltcy5zdWJcbiAgICApXG4gICAgICAucmVwbGFjZSgvW15hLXpBLVowLTkuXy1dL2csIFwiX1wiKVxuICAgICAgLnNsaWNlKDAsIDUwKTtcblxuICAgIGxldCB1c2VybmFtZSA9IGJhc2VVc2VybmFtZTtcbiAgICBsZXQgYXR0ZW1wdCA9IDA7XG4gICAgd2hpbGUgKFxuICAgICAgKGRiLnF1ZXJ5KFwiU0VMRUNUIGlkIEZST00gdXNlcnMgV0hFUkUgdXNlcm5hbWUgPSA/XCIsIFt1c2VybmFtZV0pIGFzIHVua25vd25bXVtdKS5sZW5ndGggPiAwXG4gICAgKSB7XG4gICAgICBhdHRlbXB0Kys7XG4gICAgICB1c2VybmFtZSA9IGAke2Jhc2VVc2VybmFtZX1fJHthdHRlbXB0fWA7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgZGIucXVlcnkoXG4gICAgICBgSU5TRVJUIElOVE8gdXNlcnMgKGlkLCB1c2VybmFtZSwgZW1haWwsIGRpc3BsYXlfbmFtZSwgcGFzc3dvcmRfaGFzaCwgaXNfYWRtaW4sIGlzX2FjdGl2ZSwgb2lkY19zdWJqZWN0LCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0KVxuICAgICAgIFZBTFVFUyAoPywgPywgPywgPywgJ29pZGM6bm8tcGFzc3dvcmQnLCAwLCAxLCA/LCA/LCA/KWAsXG4gICAgICBbXG4gICAgICAgIGlkLFxuICAgICAgICB1c2VybmFtZSxcbiAgICAgICAgY2xhaW1zLmVtYWlsIHx8IG51bGwsXG4gICAgICAgIGNsYWltcy5uYW1lIHx8IG51bGwsXG4gICAgICAgIGNsYWltcy5zdWIsXG4gICAgICAgIG5vdyxcbiAgICAgICAgbm93LFxuICAgICAgXSxcbiAgICApO1xuXG4gICAgcm93cyA9IGRiLnF1ZXJ5KFxuICAgICAgXCJTRUxFQ1QgaWQsIHVzZXJuYW1lLCBpc19hZG1pbiwgaXNfYWN0aXZlIEZST00gdXNlcnMgV0hFUkUgaWQgPSA/XCIsXG4gICAgICBbaWRdLFxuICAgICkgYXMgdW5rbm93bltdW107XG4gIH1cblxuICBjb25zdCByb3cgPSByb3dzWzBdIGFzIHVua25vd25bXTtcbiAgY29uc3QgdXNlcklkID0gU3RyaW5nKHJvd1swXSk7XG4gIGNvbnN0IHVzZXJuYW1lID0gU3RyaW5nKHJvd1sxXSk7XG4gIGNvbnN0IGlzQWRtaW4gPSBCb29sZWFuKHJvd1syXSk7XG4gIGNvbnN0IGlzQWN0aXZlID0gQm9vbGVhbihyb3dbM10pO1xuXG4gIGlmICghaXNBY3RpdmUpIHtcbiAgICByZXR1cm4gYy5qc29uKHsgZXJyb3I6IFwiQWNjb3VudCBpcyBkaXNhYmxlZFwiIH0sIDQwMyk7XG4gIH1cblxuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgaXNzdWVTZXNzaW9uVG9rZW4oeyBpZDogdXNlcklkLCB1c2VybmFtZSwgaXNBZG1pbiB9KTtcbiAgcmV0dXJuIGMuanNvbihzZXNzaW9uKTtcbn0pO1xuXG5leHBvcnQgeyBhdXRoUm91dGVzIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxJQUFJLFFBQVEsT0FBTztBQUM1QixTQUFTLFNBQVMsUUFBUSxrQkFBa0I7QUFDNUMsU0FBUyxnQkFBZ0IsUUFBUSxrQkFBa0I7QUFDbkQsU0FDRSxnQkFBZ0IsRUFDaEIsMkJBQTJCLEVBQzNCLFdBQVcsRUFDWCxxQkFBcUIsUUFDaEIsMEJBQTBCO0FBQ2pDLFNBQ0Usc0JBQXNCLEVBQ3RCLGdCQUFnQixFQUNoQixlQUFlLFFBQ1Ysd0JBQXdCO0FBQy9CLFNBQ0UsdUJBQXVCLEVBQ3ZCLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsYUFBYSxFQUNiLG1CQUFtQixFQUNuQixjQUFjLFFBQ1QsK0JBQStCO0FBQ3RDLFNBQVMsWUFBWSxRQUFRLG1CQUFtQjtBQUNoRCxTQUFTLFVBQVUsUUFBUSxrQkFBa0I7QUFDN0MsU0FDRSxxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLGFBQWEsUUFFUixtQkFBbUI7QUFDMUIsU0FBUyxXQUFXLFFBQVEsc0JBQXNCO0FBRWxELFNBQVM7RUFDUCxNQUFNLFNBQVMsU0FBUyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLFFBQVE7RUFDdkUsTUFBTSxZQUFZLE9BQU8sUUFBUSxDQUFDLFVBQVUsU0FBUztFQUNyRCxPQUFPLEtBQUssR0FBRyxDQUFDLEtBQUssS0FBSyxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUk7QUFDOUM7QUFFQSxNQUFNLG1DQUFtQyxJQUFJO0FBQzdDLE1BQU0sWUFBWTtBQVFsQixNQUFNLHlCQUF5QixJQUFJO0FBRW5DLFNBQVMsOEJBQThCLE1BQU0sS0FBSyxHQUFHLEVBQUU7RUFDckQsS0FBSyxNQUFNLENBQUMsS0FBSyxNQUFNLElBQUksdUJBQXVCLE9BQU8sR0FBSTtJQUMzRCxJQUFJLE1BQU0sU0FBUyxJQUFJLE9BQU8sTUFBTSxJQUFJLEVBQUU7TUFDeEMsdUJBQXVCLE1BQU0sQ0FBQztJQUNoQztFQUNGO0FBQ0Y7QUFFQSxlQUFlLGtCQUFrQixDQUloQztFQUNDLE1BQU0sYUFBYTtFQUNuQixNQUFNLE1BQU0sS0FBSyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUs7RUFDcEMsTUFBTSxRQUFRLE1BQU0sVUFBVTtJQUM1QixRQUFRLEVBQUUsRUFBRTtJQUNaLFVBQVUsRUFBRSxRQUFRO0lBQ3BCLFNBQVMsRUFBRSxPQUFPO0lBQ2xCLEtBQUs7SUFDTCxLQUFLLE1BQU07RUFDYjtFQUNBLE9BQU87SUFBRTtJQUFPLFdBQVc7RUFBVztBQUN4QztBQUVBLGVBQWUsNkJBQTZCLENBSTNDO0VBQ0M7RUFDQSxNQUFNLE1BQU0sS0FBSyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUs7RUFDcEMsTUFBTSxNQUFNO0VBQ1osdUJBQXVCLEdBQUcsQ0FBQyxLQUFLO0lBQzlCLFFBQVEsRUFBRSxNQUFNO0lBQ2hCLFdBQVcsS0FBSyxHQUFHLEtBQUssbUNBQW1DO0lBQzNELE1BQU07RUFDUjtFQUNBLE9BQU8sTUFBTSxVQUFVO0lBQ3JCLE1BQU07SUFDTjtJQUNBLFFBQVEsRUFBRSxNQUFNO0lBQ2hCLFVBQVUsRUFBRSxRQUFRO0lBQ3BCLFNBQVMsRUFBRSxPQUFPO0lBQ2xCLEtBQUs7SUFDTCxLQUFLLE1BQU07RUFDYjtBQUNGO0FBRUEsU0FBUyxrQ0FBa0MsT0FBZ0M7RUFNekUsSUFBSSxRQUFRLElBQUksS0FBSyxhQUFhO0lBQ2hDLE9BQU87TUFBRSxPQUFPO01BQU8sT0FBTztJQUFvQjtFQUNwRDtFQUNBLE1BQU0sTUFBTSxPQUFPLFFBQVEsR0FBRyxLQUFLLFdBQVcsUUFBUSxHQUFHLEdBQUc7RUFDNUQsTUFBTSxTQUFTLE9BQU8sUUFBUSxNQUFNLEtBQUssV0FBVyxRQUFRLE1BQU0sR0FBRztFQUNyRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVE7SUFDbkIsT0FBTztNQUFFLE9BQU87TUFBTyxPQUFPO0lBQW9CO0VBQ3BEO0VBQ0EsTUFBTSxZQUFZLHVCQUF1QixHQUFHLENBQUM7RUFDN0MsSUFBSSxDQUFDLGFBQWEsVUFBVSxNQUFNLEtBQUssUUFBUTtJQUM3QyxPQUFPO01BQUUsT0FBTztNQUFPLE9BQU87SUFBK0I7RUFDL0Q7RUFDQSxJQUFJLFVBQVUsSUFBSSxJQUFJLFVBQVUsU0FBUyxJQUFJLEtBQUssR0FBRyxJQUFJO0lBQ3ZELHVCQUF1QixNQUFNLENBQUM7SUFDOUIsT0FBTztNQUFFLE9BQU87TUFBTyxPQUFPO0lBQStCO0VBQy9EO0VBQ0EsT0FBTztJQUFFLE9BQU87SUFBTTtJQUFLO0VBQU87QUFDcEM7QUFFQSxTQUFTLG9CQUFvQixHQUFXO0VBQ3RDLE1BQU0sWUFBWSx1QkFBdUIsR0FBRyxDQUFDO0VBQzdDLElBQUksQ0FBQyxXQUFXO0VBQ2hCLFVBQVUsSUFBSSxHQUFHO0VBQ2pCLHVCQUF1QixHQUFHLENBQUMsS0FBSztFQUNoQztBQUNGO0FBRUEsTUFBTSxhQUFhLElBQUk7QUFFdkIsV0FBVyxJQUFJLENBQUMsZUFBZSxPQUFPO0VBQ3BDLE1BQU0sU0FBUztFQUNmLE1BQU0sV0FBVyxZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxVQUFVO0VBRWpFLElBQUk7RUFDSixJQUFJO0VBRUosSUFBSTtJQUNGLE1BQU0sT0FBTyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUk7SUFDN0IsSUFDRSxRQUNBLE9BQU8sS0FBSyxRQUFRLEtBQUssWUFDekIsT0FBTyxLQUFLLFFBQVEsS0FBSyxVQUN6QjtNQUNBLFdBQVcsS0FBSyxRQUFRO01BQ3hCLFdBQVcsS0FBSyxRQUFRO0lBQzFCO0VBQ0YsRUFBRSxPQUFNO0VBQ04sb0VBQW9FO0VBQ3RFO0VBRUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVO0lBQzFCLE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRSxPQUFPO0lBQXNCLEdBQUc7RUFDbEQ7RUFFQSxvREFBb0Q7RUFDcEQsMkRBQTJEO0VBQzNELE1BQU0saUJBQWlCLGNBQWMsVUFBVTtFQUMvQyxJQUFJLGVBQWUsT0FBTyxFQUFFO0lBQzFCLE9BQU8sd0JBQXdCLGVBQWUsVUFBVTtFQUMxRDtFQUVBLHVDQUF1QztFQUN2QyxNQUFNLE9BQU8sTUFBTSxpQkFBaUIsVUFBVTtFQUM5QyxJQUFJLENBQUMsTUFBTTtJQUNULGlGQUFpRjtJQUNqRixvQkFBb0IsVUFBVTtJQUM5QixPQUFPLEVBQUUsSUFBSSxDQUFDO01BQUUsT0FBTztJQUFzQixHQUFHO0VBQ2xEO0VBRUEsOENBQThDO0VBQzlDLGVBQWUsVUFBVTtFQUV6QixJQUFJLEtBQUssZ0JBQWdCLElBQUksQ0FBQyxXQUFXO0lBQ3ZDLE1BQU0sUUFBUSxzQkFBc0IsS0FBSyxFQUFFO0lBQzNDLElBQUksQ0FBQyxPQUFPLFdBQVcsQ0FBQyxNQUFNLGVBQWUsRUFBRTtNQUM3QyxPQUFPLEVBQUUsSUFBSSxDQUNYO1FBQUUsT0FBTztNQUE4QyxHQUN2RDtJQUVKO0lBQ0EsTUFBTSxZQUFZLE1BQU0sNkJBQTZCO01BQ25ELFFBQVEsS0FBSyxFQUFFO01BQ2YsVUFBVSxLQUFLLFFBQVE7TUFDdkIsU0FBUyxLQUFLLE9BQU87SUFDdkI7SUFDQSxPQUFPLEVBQUUsSUFBSSxDQUFDO01BQ1osbUJBQW1CO01BQ25CLGdCQUFnQjtNQUNoQixXQUFXO0lBQ2I7RUFDRjtFQUVBLE1BQU0sVUFBVSxNQUFNLGtCQUFrQjtFQUN4QyxPQUFPLEVBQUUsSUFBSSxDQUFDO0FBQ2hCO0FBRUEsV0FBVyxJQUFJLENBQUMsb0JBQW9CLE9BQU87RUFDekMsSUFBSSxXQUFXO0lBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQztNQUFFLE9BQU87SUFBb0MsR0FBRztFQUNoRTtFQUVBLE1BQU0sU0FBUztFQUNmLE1BQU0sV0FBVyxZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxVQUFVO0VBRWpFLElBQUk7RUFDSixJQUFJO0VBQ0osSUFBSTtJQUNGLE1BQU0sT0FBTyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUk7SUFDN0IsSUFDRSxRQUNBLE9BQU8sS0FBSyxjQUFjLEtBQUssWUFDL0IsT0FBTyxLQUFLLEtBQUssS0FBSyxVQUN0QjtNQUNBLGlCQUFpQixLQUFLLGNBQWM7TUFDcEMsUUFBUSxLQUFLLEtBQUs7SUFDcEI7RUFDRixFQUFFLE9BQU07RUFDTixzQkFBc0I7RUFDeEI7RUFFQSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTztJQUM3QixPQUFPLEVBQUUsSUFBSSxDQUFDO01BQUUsT0FBTztJQUFtQyxHQUFHO0VBQy9EO0VBRUEsTUFBTSxVQUFVLE1BQU0saUJBQWlCO0VBQ3ZDLElBQUksQ0FBQyxTQUFTLE9BQU8sRUFBRSxJQUFJLENBQUM7SUFBRSxPQUFPO0VBQStCLEdBQUc7RUFFdkUsTUFBTSxTQUFTLGtDQUFrQztFQUNqRCxJQUFJLENBQUMsT0FBTyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQztJQUFFLE9BQU8sT0FBTyxLQUFLO0VBQUMsR0FBRztFQUUxRCwrREFBK0Q7RUFDL0QsTUFBTSxpQkFBaUIsY0FBYyxVQUFVLE9BQU8sTUFBTTtFQUM1RCxJQUFJLGVBQWUsT0FBTyxFQUN4QixPQUFPLHdCQUF3QixlQUFlLFVBQVU7RUFFMUQsTUFBTSxPQUFPLFlBQVksT0FBTyxNQUFNO0VBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLGdCQUFnQixFQUFFO0lBQ3JELE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRSxPQUFPO0lBQTBCLEdBQUc7RUFDdEQ7RUFDQSxNQUFNLFFBQVEsc0JBQXNCLE9BQU8sTUFBTTtFQUNqRCxJQUFJLENBQUMsT0FBTyxXQUFXLENBQUMsTUFBTSxlQUFlLEVBQUU7SUFDN0MsT0FBTyxFQUFFLElBQUksQ0FBQztNQUFFLE9BQU87SUFBc0MsR0FBRztFQUNsRTtFQUVBLE1BQU0sU0FBUyxNQUFNLHVCQUF1QixNQUFNLGVBQWU7RUFDakUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsUUFBUSxLQUFLLFFBQVEsRUFBRSxRQUFRO0lBQzdELG9CQUFvQixVQUFVLE9BQU8sTUFBTTtJQUMzQyxPQUFPLEVBQUUsSUFBSSxDQUFDO01BQUUsT0FBTztJQUFvQixHQUFHO0VBQ2hEO0VBRUEsb0JBQW9CLE9BQU8sR0FBRztFQUM5QixlQUFlLFVBQVUsT0FBTyxNQUFNO0VBQ3RDLE1BQU0sVUFBVSxNQUFNLGtCQUFrQjtFQUN4QyxPQUFPLEVBQUUsSUFBSSxDQUFDO0FBQ2hCO0FBRUEsV0FBVyxJQUFJLENBQUMscUJBQXFCLE9BQU87RUFDMUMsSUFBSSxXQUFXO0lBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQztNQUFFLE9BQU87SUFBb0MsR0FBRztFQUNoRTtFQUVBLE1BQU0sU0FBUztFQUNmLE1BQU0sV0FBVyxZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxVQUFVO0VBRWpFLElBQUk7RUFDSixJQUFJO0VBQ0osSUFBSTtJQUNGLE1BQU0sT0FBTyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUk7SUFDN0IsSUFDRSxRQUNBLE9BQU8sS0FBSyxjQUFjLEtBQUssWUFDL0IsT0FBTyxLQUFLLFlBQVksS0FBSyxVQUM3QjtNQUNBLGlCQUFpQixLQUFLLGNBQWM7TUFDcEMsZUFBZSxLQUFLLFlBQVk7SUFDbEM7RUFDRixFQUFFLE9BQU07RUFDTixzQkFBc0I7RUFDeEI7RUFFQSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYztJQUNwQyxPQUFPLEVBQUUsSUFBSSxDQUFDO01BQUUsT0FBTztJQUErQixHQUFHO0VBQzNEO0VBRUEsTUFBTSxVQUFVLE1BQU0saUJBQWlCO0VBQ3ZDLElBQUksQ0FBQyxTQUFTLE9BQU8sRUFBRSxJQUFJLENBQUM7SUFBRSxPQUFPO0VBQStCLEdBQUc7RUFDdkUsTUFBTSxTQUFTLGtDQUFrQztFQUNqRCxJQUFJLENBQUMsT0FBTyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQztJQUFFLE9BQU8sT0FBTyxLQUFLO0VBQUMsR0FBRztFQUUxRCxtRUFBbUU7RUFDbkUsTUFBTSxpQkFBaUIsY0FBYyxVQUFVLE9BQU8sTUFBTTtFQUM1RCxJQUFJLGVBQWUsT0FBTyxFQUN4QixPQUFPLHdCQUF3QixlQUFlLFVBQVU7RUFFMUQsTUFBTSxPQUFPLFlBQVksT0FBTyxNQUFNO0VBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLGdCQUFnQixFQUFFO0lBQ3JELE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRSxPQUFPO0lBQTBCLEdBQUc7RUFDdEQ7RUFFQSxNQUFNLGVBQWUsTUFBTSxpQkFBaUI7RUFDNUMsTUFBTSxXQUFXLDRCQUE0QixPQUFPLE1BQU0sRUFBRTtFQUM1RCxJQUFJLENBQUMsVUFBVTtJQUNiLG9CQUFvQixVQUFVLE9BQU8sTUFBTTtJQUMzQyxPQUFPLEVBQUUsSUFBSSxDQUFDO01BQUUsT0FBTztJQUF3QixHQUFHO0VBQ3BEO0VBRUEsb0JBQW9CLE9BQU8sR0FBRztFQUM5QixlQUFlLFVBQVUsT0FBTyxNQUFNO0VBQ3RDLE1BQU0sVUFBVSxNQUFNLGtCQUFrQjtFQUN4QyxPQUFPLEVBQUUsSUFBSSxDQUFDO0FBQ2hCO0FBRUEsV0FBVyxHQUFHLENBQUMsd0JBQXdCLE9BQU87RUFDNUMsTUFBTSxPQUFPO0VBQ2IsSUFBSSxDQUFDLEtBQUssT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUM7SUFBRSxPQUFPO0VBQW1CLEdBQUc7RUFDaEUsSUFBSTtJQUNGLE1BQU0sTUFBTSxNQUFNO0lBQ2xCLE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRTtJQUFJO0VBQ3RCLEVBQUUsT0FBTyxLQUFLO0lBQ1osUUFBUSxLQUFLLENBQUMseUJBQXlCO0lBQ3ZDLE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRSxPQUFPO0lBQW9DLEdBQUc7RUFDaEU7QUFDRjtBQUVBLFdBQVcsSUFBSSxDQUFDLHVCQUF1QixPQUFPO0VBQzVDLE1BQU0sT0FBTztFQUNiLElBQUksQ0FBQyxLQUFLLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDO0lBQUUsT0FBTztFQUFtQixHQUFHO0VBRWhFLElBQUk7RUFDSixJQUFJO0VBQ0osSUFBSTtJQUNGLE1BQU0sT0FBTyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUk7SUFDN0IsT0FBTyxPQUFPLEtBQUssSUFBSSxLQUFLLFdBQVcsS0FBSyxJQUFJLEdBQUc7SUFDbkQsUUFBUSxPQUFPLEtBQUssS0FBSyxLQUFLLFdBQVcsS0FBSyxLQUFLLEdBQUc7RUFDeEQsRUFBRSxPQUFNO0lBQ04sT0FBTyxFQUFFLElBQUksQ0FBQztNQUFFLE9BQU87SUFBdUIsR0FBRztFQUNuRDtFQUVBLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxPQUFPLEVBQUUsSUFBSSxDQUFDO0lBQUUsT0FBTztFQUF3QixHQUFHO0VBRXZFLElBQUk7RUFDSixJQUFJO0lBQ0YsU0FBUyxNQUFNLGtCQUFrQixNQUFNO0VBQ3pDLEVBQUUsT0FBTyxLQUFLO0lBQ1osUUFBUSxLQUFLLENBQUMsd0JBQXdCO0lBQ3RDLE9BQU8sRUFBRSxJQUFJLENBQUM7TUFBRSxPQUFPO0lBQTJCLEdBQUc7RUFDdkQ7RUFFQSxNQUFNLEtBQUs7RUFFWCw2QkFBNkI7RUFDN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUNqQiw4RUFDQTtJQUFDLE9BQU8sR0FBRztHQUFDO0VBR2QsNENBQTRDO0VBQzVDLElBQUksS0FBSyxNQUFNLEtBQUssS0FBSyxPQUFPLEtBQUssRUFBRTtJQUNyQyxPQUFPLEdBQUcsS0FBSyxDQUNiLHVFQUNBO01BQUMsT0FBTyxLQUFLO0tBQUM7SUFFaEIsSUFBSSxLQUFLLE1BQU0sR0FBRyxHQUFHO01BQ25CLEdBQUcsS0FBSyxDQUNOLGtFQUNBO1FBQUMsT0FBTyxHQUFHO1FBQUUsSUFBSSxPQUFPLFdBQVc7UUFBSSxPQUFPLEFBQUMsSUFBSSxDQUFDLEVBQUUsQUFBYyxDQUFDLEVBQUU7T0FBRTtJQUU3RTtFQUNGO0VBRUEsK0JBQStCO0VBQy9CLElBQUksS0FBSyxNQUFNLEtBQUssR0FBRztJQUNyQixJQUFJLENBQUMsS0FBSyxhQUFhLEVBQUU7TUFDdkIsT0FBTyxFQUFFLElBQUksQ0FDWDtRQUFFLE9BQU87TUFBdUQsR0FDaEU7SUFFSjtJQUVBLE1BQU0sZUFBZSxDQUNuQixPQUFPLGtCQUFrQixJQUFJLE9BQU8sSUFBSSxJQUFJLE9BQU8sR0FBRyxBQUN4RCxFQUNHLE9BQU8sQ0FBQyxvQkFBb0IsS0FDNUIsS0FBSyxDQUFDLEdBQUc7SUFFWixJQUFJLFdBQVc7SUFDZixJQUFJLFVBQVU7SUFDZCxNQUNFLEFBQUMsR0FBRyxLQUFLLENBQUMsMkNBQTJDO01BQUM7S0FBUyxFQUFrQixNQUFNLEdBQUcsRUFDMUY7TUFDQTtNQUNBLFdBQVcsR0FBRyxhQUFhLENBQUMsRUFBRSxTQUFTO0lBQ3pDO0lBRUEsTUFBTSxLQUFLO0lBQ1gsTUFBTSxNQUFNLElBQUksT0FBTyxXQUFXO0lBQ2xDLEdBQUcsS0FBSyxDQUNOLENBQUM7NkRBQ3NELENBQUMsRUFDeEQ7TUFDRTtNQUNBO01BQ0EsT0FBTyxLQUFLLElBQUk7TUFDaEIsT0FBTyxJQUFJLElBQUk7TUFDZixPQUFPLEdBQUc7TUFDVjtNQUNBO0tBQ0Q7SUFHSCxPQUFPLEdBQUcsS0FBSyxDQUNiLG9FQUNBO01BQUM7S0FBRztFQUVSO0VBRUEsTUFBTSxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQ25CLE1BQU0sU0FBUyxPQUFPLEdBQUcsQ0FBQyxFQUFFO0VBQzVCLE1BQU0sV0FBVyxPQUFPLEdBQUcsQ0FBQyxFQUFFO0VBQzlCLE1BQU0sVUFBVSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0VBQzlCLE1BQU0sV0FBVyxRQUFRLEdBQUcsQ0FBQyxFQUFFO0VBRS9CLElBQUksQ0FBQyxVQUFVO0lBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQztNQUFFLE9BQU87SUFBc0IsR0FBRztFQUNsRDtFQUVBLE1BQU0sVUFBVSxNQUFNLGtCQUFrQjtJQUFFLElBQUk7SUFBUTtJQUFVO0VBQVE7RUFDeEUsT0FBTyxFQUFFLElBQUksQ0FBQztBQUNoQjtBQUVBLFNBQVMsVUFBVSxHQUFHIn0=
// denoCacheMetadata=830412376490072736,16939153645580935204