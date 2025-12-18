import React from "react";
import {
  FileText,
  Pencil,
  Eye,
  Copy,
  Download,
  GitPullRequest,
} from "lucide-react";

const ReadmePlaceholder = ({ loading }) => {
  return (
    <div
      className={`readme-placeholder ${
        loading ? "readme-placeholder--loading" : ""
      }`}
    >
      <div className="readme-placeholder__header">
        <div className="readme-placeholder__tabs">
          <button className="readme-placeholder__tab" disabled>
            <Pencil /> Edit
          </button>
          <button
            className="readme-placeholder__tab readme-placeholder__tab--active"
            disabled
          >
            <Eye /> Preview
          </button>
        </div>
        <div className="readme-placeholder__actions">
          <button className="readme-placeholder__btn" disabled>
            <Copy /> Copy
          </button>
          <button className="readme-placeholder__btn" disabled>
            <Download /> Download
          </button>
          <button
            className="readme-placeholder__btn readme-placeholder__btn--primary"
            disabled
          >
            <GitPullRequest /> Create PR
          </button>
        </div>
      </div>

      <div className="readme-placeholder__content">
        <div className="readme-placeholder__skeleton">
          {/* Title */}
          <div className="skeleton-line skeleton-line--title"></div>

          {/* Badges */}
          <div className="skeleton-badges">
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
          </div>

          {/* Description paragraph */}
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--medium"></div>

          {/* Section heading */}
          <div className="skeleton-line skeleton-line--heading"></div>

          {/* List items */}
          <div className="skeleton-line skeleton-line--list"></div>
          <div className="skeleton-line skeleton-line--list"></div>
          <div className="skeleton-line skeleton-line--list"></div>

          {/* Section heading */}
          <div className="skeleton-line skeleton-line--heading"></div>

          {/* Section heading */}
          <div className="skeleton-line skeleton-line--heading"></div>

          {/* Paragraph */}
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--full"></div>
          <div className="skeleton-line skeleton-line--short"></div>
        </div>
      </div>
    </div>
  );
};

export default ReadmePlaceholder;
