/**
 * Netlify Function: create-pr
 * Creates a GitHub Pull Request with the generated README
 * Uses authenticated session token from cookie
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

/**
 * Generates a unique request ID for tracing
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

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

/**
 * Extracts GitHub token from session cookie
 * @param {Object} event - Netlify function event
 * @returns {string|null} GitHub token or null
 */
const getTokenFromSession = (event) => {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;

  const cookies = parseCookies(event.headers.cookie);
  const sessionCookie = cookies.session;
  if (!sessionCookie) return null;

  const decrypted = decrypt(sessionCookie, authSecret);
  if (!decrypted) return null;

  try {
    const session = JSON.parse(decrypted);
    return session.token;
  } catch {
    return null;
  }
};

/**
 * Sanitizes error details to avoid leaking sensitive information
 * @param {string} details - Raw error details
 * @returns {string} Sanitized error details
 */
const sanitizeErrorDetails = (details) => {
  if (!details) return "Unknown error";

  return details
    .replace(/ghp_[a-zA-Z0-9]{36,}/g, "[REDACTED_TOKEN]")
    .replace(/github_pat_[a-zA-Z0-9_]{22,}/g, "[REDACTED_TOKEN]")
    .replace(/gho_[a-zA-Z0-9]{36,}/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[a-zA-Z0-9-_]+/gi, "Bearer [REDACTED]")
    .replace(/"sha":\s*"[a-f0-9]{40}"/g, '"sha": "[REDACTED]"')
    .substring(0, 500);
};

/**
 * Makes a GitHub API request with error handling
 * @param {string} url - GitHub API URL
 * @param {Object} options - Fetch options
 * @param {string} requestId - Request ID for logging
 * @param {string} operation - Description of the operation
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
const githubFetch = async (url, options, requestId, operation) => {
  console.log(`[${requestId}] ${operation}: ${options.method || "GET"} ${url}`);

  const response = await fetch(url, options);

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    console.error(`[${requestId}] ${operation} failed:`, {
      status: response.status,
      error:
        typeof data === "string"
          ? sanitizeErrorDetails(data)
          : data.message || "Unknown error",
    });
  } else {
    console.log(`[${requestId}] ${operation} succeeded`);
  }

  return { ok: response.ok, status: response.status, data };
};

exports.handler = async (event) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };

  console.log(`[${requestId}] Incoming ${event.httpMethod} request`);

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    console.warn(`[${requestId}] Method not allowed: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed", requestId }),
    };
  }

  // Get token from session
  const token = getTokenFromSession(event);

  if (!token) {
    console.warn(`[${requestId}] No valid session found`);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: "Not authenticated. Please sign in with GitHub.",
        requestId,
      }),
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid JSON in request body",
          requestId,
        }),
      };
    }

    const { owner, repo, content, defaultBranch } = body;

    // Validate required fields
    const missingFields = [];
    if (!owner) missingFields.push("owner");
    if (!repo) missingFields.push("repo");
    if (!content) missingFields.push("content");

    if (missingFields.length > 0) {
      console.warn(
        `[${requestId}] Missing required fields: ${missingFields.join(", ")}`
      );
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Missing required fields: ${missingFields.join(", ")}`,
          requestId,
        }),
      };
    }

    console.log(`[${requestId}] Creating PR for ${owner}/${repo}`);

    const githubHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "README-Generator/1.0",
    };

    const baseBranch = defaultBranch || "main";
    const newBranch = `readme-update-${Date.now()}`;

    // Step 1: Get the latest commit SHA from the base branch
    const refResult = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
      { headers: githubHeaders },
      requestId,
      "Get branch ref"
    );

    if (!refResult.ok) {
      if (refResult.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: "GitHub session expired. Please sign in again.",
            sessionExpired: true,
            requestId,
          }),
        };
      }
      if (refResult.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: `Branch '${baseBranch}' not found. Check the default branch name.`,
            requestId,
          }),
        };
      }
      if (refResult.status === 403) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: "You don't have permission to access this repository.",
            requestId,
          }),
        };
      }
      return {
        statusCode: refResult.status,
        headers,
        body: JSON.stringify({
          error: "Failed to get branch reference",
          details: sanitizeErrorDetails(JSON.stringify(refResult.data)),
          requestId,
        }),
      };
    }

    const baseSha = refResult.data.object.sha;
    console.log(`[${requestId}] Base SHA: ${baseSha.substring(0, 7)}...`);

    // Step 2: Create a new branch
    const createBranchResult = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          ref: `refs/heads/${newBranch}`,
          sha: baseSha,
        }),
      },
      requestId,
      "Create branch"
    );

    if (!createBranchResult.ok) {
      if (createBranchResult.status === 422) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            error: "Branch already exists or invalid reference",
            requestId,
          }),
        };
      }
      return {
        statusCode: createBranchResult.status,
        headers,
        body: JSON.stringify({
          error: "Failed to create branch",
          details: sanitizeErrorDetails(
            JSON.stringify(createBranchResult.data)
          ),
          requestId,
        }),
      };
    }

    console.log(`[${requestId}] Created branch: ${newBranch}`);

    // Step 3: Check if README.md exists and get its SHA
    let fileSha = null;
    const fileCheckResult = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=${newBranch}`,
      { headers: githubHeaders },
      requestId,
      "Check existing README"
    );

    if (fileCheckResult.ok) {
      fileSha = fileCheckResult.data.sha;
      console.log(`[${requestId}] Existing README found, will update`);
    } else {
      console.log(`[${requestId}] No existing README, will create new`);
    }

    // Step 4: Create or update README.md
    const contentBase64 = Buffer.from(content, "utf-8").toString("base64");
    const updateFileBody = {
      message: "Update README.md via README Generator",
      content: contentBase64,
      branch: newBranch,
    };

    if (fileSha) {
      updateFileBody.sha = fileSha;
    }

    const updateFileResult = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        method: "PUT",
        headers: githubHeaders,
        body: JSON.stringify(updateFileBody),
      },
      requestId,
      "Update README file"
    );

    if (!updateFileResult.ok) {
      // Attempt to clean up the branch we created
      console.warn(
        `[${requestId}] File update failed, attempting to clean up branch`
      );
      await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${newBranch}`,
        { method: "DELETE", headers: githubHeaders },
        requestId,
        "Cleanup branch"
      );

      return {
        statusCode: updateFileResult.status,
        headers,
        body: JSON.stringify({
          error: "Failed to update README file",
          details: sanitizeErrorDetails(JSON.stringify(updateFileResult.data)),
          requestId,
        }),
      };
    }

    // Step 5: Create pull request
    const prResult = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          title: "Update README.md",
          body: `## 📝 README Update

This README was automatically generated using [README Generator](https://github.com).

### Changes
- Updated README.md with new content

---
*Generated on ${new Date().toISOString().split("T")[0]}*`,
          head: newBranch,
          base: baseBranch,
        }),
      },
      requestId,
      "Create pull request"
    );

    if (!prResult.ok) {
      return {
        statusCode: prResult.status,
        headers,
        body: JSON.stringify({
          error: "Failed to create pull request",
          details: sanitizeErrorDetails(JSON.stringify(prResult.data)),
          requestId,
        }),
      };
    }

    const elapsed = Date.now() - startTime;
    console.log(`[${requestId}] PR created successfully in ${elapsed}ms:`, {
      prNumber: prResult.data.number,
      prUrl: prResult.data.html_url,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        prUrl: prResult.data.html_url,
        prNumber: prResult.data.number,
        branch: newBranch,
        requestId,
      }),
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] Unhandled error after ${elapsed}ms:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        details: sanitizeErrorDetails(error.message),
        requestId,
      }),
    };
  }
};
