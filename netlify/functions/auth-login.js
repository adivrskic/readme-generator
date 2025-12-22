/**
 * Netlify Function: auth-login
 * Initiates GitHub OAuth flow by redirecting to GitHub
 */

exports.handler = async (event) => {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    console.error("[auth-login] GITHUB_CLIENT_ID not configured");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OAuth not configured" }),
    };
  }

  // Get the base URL from the request or environment
  const baseUrl = process.env.URL || `https://${event.headers.host}`;
  const redirectUri = `${baseUrl}/.netlify/functions/auth-callback`;

  // Generate a random state to prevent CSRF
  const state = Buffer.from(crypto.randomUUID()).toString("base64url");

  // Build GitHub OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo read:user user:email",
    state: state,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params}`;

  console.log("[auth-login] Redirecting to GitHub OAuth");

  return {
    statusCode: 302,
    headers: {
      Location: githubAuthUrl,
      // Store state in cookie for CSRF validation
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
    body: "",
  };
};
