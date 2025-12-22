/**
 * Netlify Function: auth-logout
 * Clears the session cookie to log user out
 */

exports.handler = async (event) => {
  const baseUrl = process.env.URL || `https://${event.headers.host}`;

  console.log("[auth-logout] User logged out");

  // Clear session cookie and redirect to home
  return {
    statusCode: 302,
    headers: {
      Location: baseUrl,
      "Set-Cookie":
        "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
    body: "",
  };
};
