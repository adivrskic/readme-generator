import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  Download,
  GitPullRequest,
  Loader2,
  Pencil,
  Eye,
  LogIn,
} from "lucide-react";

const ReadmeOutput = ({
  readme,
  repoInfo,
  isAuthenticated,
  onAuthRequired,
}) => {
  const [content, setContent] = useState(readme);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [prUrl, setPrUrl] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("preview");

  useEffect(() => {
    setContent(readme);
    setPrUrl(null);
    setError("");
  }, [readme]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreatePR = async () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (!repoInfo) {
      setError("Repository info not available");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/.netlify/functions/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: include cookies for auth
        body: JSON.stringify({
          owner: repoInfo.owner,
          repo: repoInfo.name,
          content,
          defaultBranch: repoInfo.defaultBranch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle session expiry
        if (data.sessionExpired) {
          onAuthRequired();
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(data.error || "Failed to create PR");
      }

      setPrUrl(data.prUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="readme-output">
      <div className="readme-output__header">
        <div className="readme-output__tabs">
          <button
            className={`readme-output__tab ${
              mode === "edit" ? "readme-output__tab--active" : ""
            }`}
            onClick={() => setMode("edit")}
          >
            <Pencil /> Edit
          </button>
          <button
            className={`readme-output__tab ${
              mode === "preview" ? "readme-output__tab--active" : ""
            }`}
            onClick={() => setMode("preview")}
          >
            <Eye /> Preview
          </button>
        </div>
        <div className="readme-output__actions">
          <button
            className={`readme-output__btn ${
              copied ? "readme-output__btn--success" : ""
            }`}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check /> Copied!
              </>
            ) : (
              <>
                <Copy /> Copy
              </>
            )}
          </button>
          <button
            className="readme-output__btn readme-output__btn--download"
            onClick={handleDownload}
          >
            <Download /> Download
          </button>
          <button
            className="readme-output__btn readme-output__btn--primary"
            onClick={handleCreatePR}
            disabled={creating}
            title={!isAuthenticated ? "Sign in with GitHub to create PRs" : ""}
          >
            {creating ? (
              <>
                <Loader2 className="spin" /> Creating...
              </>
            ) : !isAuthenticated ? (
              <>
                <LogIn /> Sign in to Create PR
              </>
            ) : (
              <>
                <GitPullRequest /> Create PR
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="readme-output__error">{error}</div>}

      {prUrl && (
        <div className="readme-output__success">
          PR created!{" "}
          <a href={prUrl} target="_blank" rel="noopener noreferrer">
            View on GitHub →
          </a>
        </div>
      )}

      <div className="readme-output__content">
        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="markdown-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadmeOutput;
