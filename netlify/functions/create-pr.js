exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { token, owner, repo, content, defaultBranch } = JSON.parse(
      event.body || "{}"
    );

    if (!token || !owner || !repo || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const githubHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const baseBranch = defaultBranch || "main";
    const newBranch = `readme-update-${Date.now()}`;

    // 1. Get the latest commit SHA from the base branch
    const refResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
      { headers: githubHeaders }
    );

    if (!refResponse.ok) {
      const error = await refResponse.text();
      return {
        statusCode: refResponse.status,
        headers,
        body: JSON.stringify({
          error: "Failed to get branch ref",
          details: error,
        }),
      };
    }

    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // 2. Create a new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          ref: `refs/heads/${newBranch}`,
          sha: baseSha,
        }),
      }
    );

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.text();
      return {
        statusCode: createBranchResponse.status,
        headers,
        body: JSON.stringify({
          error: "Failed to create branch",
          details: error,
        }),
      };
    }

    // 3. Check if README.md exists and get its SHA if it does
    let fileSha = null;
    const fileCheckResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=${newBranch}`,
      { headers: githubHeaders }
    );

    if (fileCheckResponse.ok) {
      const fileData = await fileCheckResponse.json();
      fileSha = fileData.sha;
    }

    // 4. Create or update README.md
    const contentBase64 = Buffer.from(content).toString("base64");
    const updateFileBody = {
      message: "Update README.md via README Generator",
      content: contentBase64,
      branch: newBranch,
    };

    if (fileSha) {
      updateFileBody.sha = fileSha;
    }

    const updateFileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        method: "PUT",
        headers: githubHeaders,
        body: JSON.stringify(updateFileBody),
      }
    );

    if (!updateFileResponse.ok) {
      const error = await updateFileResponse.text();
      return {
        statusCode: updateFileResponse.status,
        headers,
        body: JSON.stringify({
          error: "Failed to update file",
          details: error,
        }),
      };
    }

    // 5. Create pull request
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          title: "Update README.md",
          body: "This README was generated using README Generator.",
          head: newBranch,
          base: baseBranch,
        }),
      }
    );

    if (!prResponse.ok) {
      const error = await prResponse.text();
      return {
        statusCode: prResponse.status,
        headers,
        body: JSON.stringify({ error: "Failed to create PR", details: error }),
      };
    }

    const prData = await prResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        prUrl: prData.html_url,
        prNumber: prData.number,
      }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};
