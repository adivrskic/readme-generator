import React, { useState } from "react";
import { X, Key, ExternalLink } from "lucide-react";

const GitHubTokenModal = ({ onClose, onSave }) => {
  const [token, setToken] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (token.trim()) {
      onSave(token.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal__close" onClick={onClose}>
          <X />
        </button>

        <div className="modal__icon">
          <Key />
        </div>

        <h2 className="modal__title">GitHub Token Required</h2>
        <p className="modal__description">
          To create a pull request, you need a GitHub Personal Access Token with{" "}
          <code>repo</code> scope.
        </p>

        <a
          href="https://github.com/settings/tokens/new?description=README%20Generator&scopes=repo"
          target="_blank"
          rel="noopener noreferrer"
          className="modal__link"
        >
          Create a token on GitHub
          <ExternalLink />
        </a>

        <form onSubmit={handleSubmit} className="modal__form">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            autoFocus
          />
          <button type="submit" disabled={!token.trim()}>
            Save Token
          </button>
        </form>

        <p className="modal__note">
          Your token is stored locally and never sent to our servers.
        </p>
      </div>
    </div>
  );
};

export default GitHubTokenModal;
