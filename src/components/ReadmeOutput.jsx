import React, { useState } from "react";
import { FileText, Copy, Check, Download } from "lucide-react";

const ReadmeOutput = ({ readme }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(readme);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([readme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!readme) {
    return (
      <div className="readme-output">
        <div className="readme-output__empty">
          <FileText size={48} />
          <p>Your generated README will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="readme-output">
      <div className="readme-output__header">
        <h2>
          <FileText size={18} />
          README.md
        </h2>
        <div className="readme-output__actions">
          <button
            className={`readme-output__btn ${
              copied ? "readme-output__btn--success" : ""
            }`}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
          <button className="readme-output__btn" onClick={handleDownload}>
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
      <div className="readme-output__content">
        <pre>{readme}</pre>
      </div>
    </div>
  );
};

export default ReadmeOutput;
