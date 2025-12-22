/**
 * Netlify Function: auth-status
 * Returns current authentication status and user info (without exposing token)
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param {string} encryptedText - Encrypted string (iv:authTag:ciphertext)
 * @param {string} secret - Secret key
 * @returns {string|null} Decrypted text or null if failed
 */
const decrypt = (encryptedText, secret) => {
  try {
    const [ivHex, authTagHex, ciphertext] = encryptedText.split(":");
    if (!ivHex || !authTagHex || !ciphertext) return null;

    const key = crypto.createHash("sha256").update(secret).digest();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.warn("[auth-status] Decryption failed:", error.message);
    return null;
  }
};

/**
 * Parses cookies from the Cookie header
 * @param {string} cookieHeader - Cookie header string
 * @returns {Object} Parsed cookies
 */
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    cookies[name] = rest.join("=");
  });

  return cookies;
};

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    console.error("[auth-status] AUTH_SECRET not configured");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Auth not configured" }),
    };
  }

  const cookies = parseCookies(event.headers.cookie);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authenticated: false,
        user: null,
      }),
    };
  }

  // Decrypt session
  const decrypted = decrypt(sessionCookie, authSecret);

  if (!decrypted) {
    console.warn("[auth-status] Invalid session cookie");
    return {
      statusCode: 200,
      headers: {
        ...headers,
        // Clear invalid session
        "Set-Cookie":
          "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      },
      body: JSON.stringify({
        authenticated: false,
        user: null,
      }),
    };
  }

  try {
    const session = JSON.parse(decrypted);

    // Check session age (30 days max)
    const sessionAge = Date.now() - session.createdAt;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    if (sessionAge > maxAge) {
      console.log("[auth-status] Session expired");
      return {
        statusCode: 200,
        headers: {
          ...headers,
          "Set-Cookie":
            "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
        body: JSON.stringify({
          authenticated: false,
          user: null,
        }),
      };
    }

    // Return user info (never expose token to client)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authenticated: true,
        user: session.user,
      }),
    };
  } catch (error) {
    console.error("[auth-status] Session parse error:", error);
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Set-Cookie":
          "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      },
      body: JSON.stringify({
        authenticated: false,
        user: null,
      }),
    };
  }
};
