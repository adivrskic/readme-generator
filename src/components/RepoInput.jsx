import React from "react";
import { Github, Sparkles, Loader2, AlertCircle } from "lucide-react";

const RepoInput = ({
  repoUrl,
  setRepoUrl,
  onSubmit,
  loading,
  error,
  stage,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="repo-input">
      <form className="repo-input__form" onSubmit={handleSubmit}>
        <div className="repo-input__field">
          <Github size={20} />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Enter GitHub URL or owner/repo"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="repo-input__submit"
          disabled={loading || !repoUrl.trim()}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate README
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="repo-input__error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading && stage && (
        <div className="repo-input__stage">
          <Loader2 size={16} className="spin" />
          {stage}
        </div>
      )}
    </div>
  );
};

export default RepoInput;
