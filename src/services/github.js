/**
 * GitHub API Service
 * Handles all communication with the GitHub API including rate limiting
 */

const BASE_URL = "https://api.github.com";

// Rate limit tracking
let rateLimit = {
  remaining: 6,
  reset: null,
};

/**
 * Returns the current rate limit status
 * @returns {Object} Rate limit info with remaining count and reset time
 */
export const getRateLimit = () => rateLimit;

/**
 * Updates rate limit tracking from response headers
 * @param {Headers} headers - Response headers from GitHub API
 */
const updateRateLimit = (headers) => {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (remaining !== null) {
    const newRemaining = parseInt(remaining, 10);
    const newReset = reset ? new Date(parseInt(reset, 10) * 1000) : null;

    // Log when rate limit is getting low
    if (newRemaining <= 10 && newRemaining !== rateLimit.remaining) {
      console.warn(
        `[GitHub] Rate limit low: ${newRemaining} requests remaining`
      );
    }

    rateLimit = {
      remaining: newRemaining,
      reset: newReset,
    };
  }
};

/**
 * Formats time until rate limit reset
 * @param {Date} resetTime - When rate limit resets
 * @returns {string} Human-readable time remaining
 */
const formatResetTime = (resetTime) => {
  const now = new Date();
  const diffMs = resetTime - now;
  const diffMins = Math.ceil(diffMs / 60000);

  if (diffMins <= 1) return "less than a minute";
  if (diffMins < 60) return `${diffMins} minute(s)`;
  return `${Math.ceil(diffMins / 60)} hour(s)`;
};

/**
 * Performs a fetch with rate limit checking and error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Object>} Parsed JSON response
 */
const fetchWithRateLimit = async (url, options = {}, retries = 2) => {
  // Check rate limit before making request
  if (
    rateLimit.remaining <= 0 &&
    rateLimit.reset &&
    new Date() < rateLimit.reset
  ) {
    const waitTime = formatResetTime(rateLimit.reset);
    console.error(`[GitHub] Rate limit exceeded, resets in ${waitTime}`);
    throw new Error(
      `GitHub API rate limit exceeded. Try again in ${waitTime}.`
    );
  }

  const fetchOptions = {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...options.headers,
    },
  };

  console.log(`[GitHub] Fetching: ${url}`);

  try {
    const response = await fetch(url, fetchOptions);
    updateRateLimit(response.headers);

    if (!response.ok) {
      const status = response.status;
      let errorBody;

      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }

      console.error(`[GitHub] API error ${status}:`, errorBody);

      // Handle specific error codes
      if (status === 404) {
        throw new Error(
          "Repository not found. Make sure it exists and is public."
        );
      }

      if (status === 403) {
        const rateLimitRemaining = response.headers.get(
          "x-ratelimit-remaining"
        );
        if (rateLimitRemaining === "0") {
          throw new Error(
            "GitHub API rate limit exceeded. Please wait before trying again."
          );
        }
        throw new Error("Access forbidden. The repository may be private.");
      }

      if (status === 401) {
        throw new Error(
          "Authentication failed. Please check your GitHub token."
        );
      }

      // Retry on server errors
      if (status >= 500 && retries > 0) {
        console.warn(
          `[GitHub] Server error, retrying... (${retries} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchWithRateLimit(url, options, retries - 1);
      }

      throw new Error(
        `GitHub API error: ${status} - ${errorBody?.message || "Unknown error"}`
      );
    }

    return response.json();
  } catch (error) {
    // Retry on network errors
    if (error.name === "TypeError" && retries > 0) {
      console.warn(
        `[GitHub] Network error, retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRateLimit(url, options, retries - 1);
    }
    throw error;
  }
};

/**
 * Parses a GitHub URL or owner/repo string into components
 * @param {string} url - GitHub URL or owner/repo format
 * @returns {Object|null} Parsed {owner, repo} or null if invalid
 */
export const parseGitHubUrl = (url) => {
  if (!url || typeof url !== "string") {
    console.warn("[GitHub] Invalid URL input:", url);
    return null;
  }

  const patterns = [
    /github\.com\/([^/]+)\/([^/?#]+)/, // Full GitHub URL
    /^([^/]+)\/([^/]+)$/, // owner/repo format
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      const result = {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
      };
      console.log(`[GitHub] Parsed URL: ${result.owner}/${result.repo}`);
      return result;
    }
  }

  console.warn("[GitHub] Could not parse URL:", url);
  return null;
};

/**
 * Decodes base64 content from GitHub API
 * Uses Buffer for Node.js compatibility (avoids deprecated atob)
 * @param {string} base64Content - Base64 encoded string
 * @returns {string} Decoded UTF-8 string
 */
const decodeBase64 = (base64Content) => {
  // Handle browser vs Node.js environments
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64Content, "base64").toString("utf-8");
  }
  // Fallback for browser (though this app runs in browser, Buffer polyfill may be available)
  return decodeURIComponent(
    atob(base64Content)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
};

/**
 * Fetches the content of a file from a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path within repository
 * @returns {Promise<string|null>} File content or null if not found
 */
const fetchFileContent = async (owner, repo, path) => {
  try {
    console.log(`[GitHub] Fetching file: ${path}`);
    const data = await fetchWithRateLimit(
      `${BASE_URL}/repos/${owner}/${repo}/contents/${path}`
    );

    if (!data.content) {
      console.warn(`[GitHub] No content in file response for: ${path}`);
      return null;
    }

    // Remove newlines that GitHub adds to base64 content
    const cleanContent = data.content.replace(/\n/g, "");
    return decodeBase64(cleanContent);
  } catch (error) {
    console.warn(`[GitHub] Failed to fetch file ${path}:`, error.message);
    return null;
  }
};

/**
 * Fetches comprehensive repository data
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Function} onStageChange - Callback for progress updates
 * @returns {Promise<Object>} Repository data object
 */
export const fetchRepoData = async (owner, repo, onStageChange) => {
  const startTime = Date.now();
  console.log(`[GitHub] Starting data fetch for ${owner}/${repo}`);

  try {
    onStageChange("Fetching repository info...");
    const repoData = await fetchWithRateLimit(
      `${BASE_URL}/repos/${owner}/${repo}`
    );
    console.log(`[GitHub] Repository found: ${repoData.full_name}`);

    onStageChange("Fetching languages...");
    const languages = await fetchWithRateLimit(
      `${BASE_URL}/repos/${owner}/${repo}/languages`
    );
    console.log(
      `[GitHub] Languages:`,
      Object.keys(languages).join(", ") || "none"
    );

    onStageChange("Analyzing file structure...");
    let files = [];
    let directories = [];

    try {
      const tree = await fetchWithRateLimit(
        `${BASE_URL}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`
      );

      if (tree.tree) {
        files = tree.tree
          .filter((item) => item.type === "blob")
          .map((item) => item.path)
          .slice(0, 150);

        directories = tree.tree
          .filter((item) => item.type === "tree")
          .map((item) => item.path)
          .slice(0, 50);

        console.log(
          `[GitHub] Found ${files.length} files, ${directories.length} directories`
        );
      }
    } catch (treeError) {
      console.warn("[GitHub] Failed to fetch file tree:", treeError.message);
      console.warn(
        "[GitHub] Continuing without file list (may affect README quality)"
      );
    }

    onStageChange("Reading config files...");
    const configFiles = {};

    const configPaths = [
      "package.json",
      "requirements.txt",
      "Cargo.toml",
      "pyproject.toml",
      "go.mod",
      "composer.json",
      "Gemfile",
      "pom.xml",
      "build.gradle",
      "setup.py",
      "CMakeLists.txt",
      "Makefile",
    ];

    // Fetch config files in parallel for better performance
    const configPromises = configPaths
      .filter((path) => files.includes(path))
      .map(async (path) => {
        const content = await fetchFileContent(owner, repo, path);
        return { path, content };
      });

    const configResults = await Promise.all(configPromises);

    for (const { path, content } of configResults) {
      if (content) {
        configFiles[path] = content;
        console.log(`[GitHub] Loaded config file: ${path}`);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[GitHub] Data fetch complete in ${elapsed}ms`);

    return {
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      owner: repoData.owner.login,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      openIssues: repoData.open_issues_count,
      license: repoData.license?.spdx_id || repoData.license?.name,
      topics: repoData.topics || [],
      homepage: repoData.homepage,
      defaultBranch: repoData.default_branch,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      languages,
      files,
      directories,
      configFiles,
    };
  } catch (error) {
    console.error(`[GitHub] Failed to fetch repo data:`, error);
    throw error;
  }
};
