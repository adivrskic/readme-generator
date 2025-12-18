const BASE_URL = "https://api.github.com";

let rateLimit = {
  remaining: 60,
  reset: null,
};

export const getRateLimit = () => rateLimit;

const updateRateLimit = (headers) => {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (remaining !== null) {
    rateLimit = {
      remaining: parseInt(remaining, 10),
      reset: reset ? new Date(parseInt(reset, 10) * 1000) : null,
    };
  }
};

const fetchWithRateLimit = async (url) => {
  if (
    rateLimit.remaining <= 0 &&
    rateLimit.reset &&
    new Date() < rateLimit.reset
  ) {
    const waitMinutes = Math.ceil((rateLimit.reset - new Date()) / 60000);
    throw new Error(
      `Rate limit exceeded. Try again in ${waitMinutes} minute(s).`
    );
  }

  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  updateRateLimit(response.headers);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Repository not found. Make sure it exists and is public."
      );
    }
    if (response.status === 403) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }
    throw new Error("Failed to fetch repository data.");
  }

  return response.json();
};

export const parseGitHubUrl = (url) => {
  const patterns = [/github\.com\/([^/]+)\/([^/?#]+)/, /^([^/]+)\/([^/]+)$/];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
      };
    }
  }

  return null;
};

const fetchFileContent = async (owner, repo, path) => {
  try {
    const data = await fetchWithRateLimit(
      `${BASE_URL}/repos/${owner}/${repo}/contents/${path}`
    );
    return atob(data.content);
  } catch {
    return null;
  }
};

export const fetchRepoData = async (owner, repo, onStageChange) => {
  onStageChange("Fetching repository info...");
  const repoData = await fetchWithRateLimit(
    `${BASE_URL}/repos/${owner}/${repo}`
  );

  onStageChange("Fetching languages...");
  const languages = await fetchWithRateLimit(
    `${BASE_URL}/repos/${owner}/${repo}/languages`
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
    }
  } catch {
    // Tree fetch failed, continue without file list
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
  ];

  for (const path of configPaths) {
    if (files.includes(path)) {
      const content = await fetchFileContent(owner, repo, path);
      if (content) {
        configFiles[path] = content;
      }
    }
  }

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
};
