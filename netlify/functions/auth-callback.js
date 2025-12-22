/**
 * Netlify Function: auth-callback
 * Handles GitHub OAuth callback, exchanges code for token, creates session
 */

const crypto = require("crypto");

// Encryption helpers for secure token storage in cookies
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} secret - Secret key (will be hashed to 32 bytes)
 * @returns {string} Encrypted string (iv:authTag:ciphertext)
 */
const encrypt = (text, secret) => {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
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
  const { code, state, error: oauthError } = event.queryStringParameters || {};
  const baseUrl = process.env.URL || `https://${event.headers.host}`;

  // Handle OAuth errors
  if (oauthError) {
    console.error("[auth-callback] OAuth error:", oauthError);
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?error=oauth_denied`,
      },
      body: "",
    };
  }

  if (!code) {
    console.error("[auth-callback] No code provided");
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?error=no_code`,
      },
      body: "",
    };
  }

  // Validate state to prevent CSRF
  const cookies = parseCookies(event.headers.cookie);
  if (!state || state !== cookies.oauth_state) {
    console.error("[auth-callback] State mismatch - possible CSRF attempt");
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?error=invalid_state`,
        // Clear the state cookie
        "Set-Cookie":
          "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      },
      body: "",
    };
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;

  if (!clientId || !clientSecret || !authSecret) {
    console.error("[auth-callback] Missing environment variables");
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?error=config_error`,
      },
      body: "",
    };
  }

  try {
    // Exchange code for access token
    console.log("[auth-callback] Exchanging code for token");

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("[auth-callback] Token exchange error:", tokenData.error);
      return {
        statusCode: 302,
        headers: {
          Location: `${baseUrl}/?error=token_exchange_failed`,
        },
        body: "",
      };
    }

    const accessToken = tokenData.access_token;

    // Fetch user info
    console.log("[auth-callback] Fetching user info");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      console.error(
        "[auth-callback] Failed to fetch user:",
        userResponse.status
      );
      return {
        statusCode: 302,
        headers: {
          Location: `${baseUrl}/?error=user_fetch_failed`,
        },
        body: "",
      };
    }

    const userData = await userResponse.json();

    // Create session data
    const session = {
      token: accessToken,
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar: userData.avatar_url,
        email: userData.email,
      },
      createdAt: Date.now(),
    };

    // Encrypt session for cookie storage
    const encryptedSession = encrypt(JSON.stringify(session), authSecret);

    console.log("[auth-callback] Login successful for:", userData.login);

    // Set session cookie and redirect to app
    // Cookie expires in 30 days
    const maxAge = 30 * 24 * 60 * 60;

    return {
      statusCode: 302,
      headers: {
        Location: baseUrl,
        "Set-Cookie": [
          `session=${encryptedSession}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
          "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        ].join(", "),
      },
      body: "",
    };
  } catch (error) {
    console.error("[auth-callback] Unexpected error:", error);
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?error=unexpected`,
      },
      body: "",
    };
  }
};
