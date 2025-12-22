/**
 * Netlify Function: generate-readme
 * Proxies requests to Anthropic API for README generation
 */

/**
 * Generates a unique request ID for tracing
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Sanitizes error details to avoid leaking sensitive information
 * @param {string} details - Raw error details
 * @returns {string} Sanitized error details
 */
const sanitizeErrorDetails = (details) => {
  if (!details) return "Unknown error";

  // Remove potential API keys or tokens from error messages
  return details
    .replace(/sk-[a-zA-Z0-9-_]{20,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9-_]+/gi, "Bearer [REDACTED]")
    .substring(0, 500); // Limit length
};

exports.handler = async (event) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };

  console.log(`[${requestId}] Incoming ${event.httpMethod} request`);

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight`);
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    console.warn(`[${requestId}] Method not allowed: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
        requestId,
      }),
    };
  }

  try {
    // Parse and validate request body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (parseError) {
      console.error(
        `[${requestId}] Failed to parse request body:`,
        parseError.message
      );
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid JSON in request body",
          requestId,
        }),
      };
    }

    const { prompt } = body;

    if (!prompt) {
      console.warn(`[${requestId}] Missing prompt in request`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Prompt is required",
          requestId,
        }),
      };
    }

    if (typeof prompt !== "string") {
      console.warn(`[${requestId}] Invalid prompt type: ${typeof prompt}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Prompt must be a string",
          requestId,
        }),
      };
    }

    // Check prompt length (rough token estimate)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    console.log(
      `[${requestId}] Prompt length: ${prompt.length} chars (~${estimatedTokens} tokens)`
    );

    if (prompt.length > 100000) {
      console.warn(`[${requestId}] Prompt too long: ${prompt.length} chars`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Prompt exceeds maximum length",
          requestId,
        }),
      };
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error(
        `[${requestId}] ANTHROPIC_API_KEY environment variable is not set`
      );
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server configuration error: API key not configured",
          requestId,
        }),
      };
    }

    // Call Anthropic API
    console.log(`[${requestId}] Calling Anthropic API...`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = "Could not read error response";
      }

      console.error(`[${requestId}] Anthropic API error after ${elapsed}ms:`, {
        status: response.status,
        statusText: response.statusText,
        error: sanitizeErrorDetails(errorText),
      });

      // Map Anthropic errors to user-friendly messages
      let userMessage = "Failed to generate README";
      if (response.status === 401) {
        userMessage = "API authentication failed";
      } else if (response.status === 429) {
        userMessage = "Rate limit exceeded. Please try again in a moment";
      } else if (response.status === 500) {
        userMessage = "AI service temporarily unavailable";
      } else if (response.status === 400) {
        userMessage = "Invalid request to AI service";
      }

      return {
        statusCode: response.status >= 500 ? 502 : response.status,
        headers,
        body: JSON.stringify({
          error: userMessage,
          details: sanitizeErrorDetails(errorText),
          requestId,
        }),
      };
    }

    const data = await response.json();

    console.log(`[${requestId}] Success after ${elapsed}ms:`, {
      model: data.model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      stopReason: data.stop_reason,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] Unhandled error after ${elapsed}ms:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Determine if this is a network error
    const isNetworkError =
      error.name === "TypeError" ||
      error.message.includes("fetch") ||
      error.message.includes("network");

    return {
      statusCode: isNetworkError ? 502 : 500,
      headers,
      body: JSON.stringify({
        error: isNetworkError
          ? "Could not connect to AI service"
          : "Internal server error",
        details: sanitizeErrorDetails(error.message),
        requestId,
      }),
    };
  }
};
