import React from "react";
import { List } from "lucide-react";

const TocToggle = ({ includeToc, setIncludeToc }) => {
  return (
    <div className="toc-toggle">
      <div className="toc-toggle__info">
        <List className="toc-toggle__icon" />
        <div className="toc-toggle__text">
          <span className="toc-toggle__label">Table of Contents</span>
          <span className="toc-toggle__desc">
            Auto-generated navigation links
          </span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={includeToc}
        className={`toc-toggle__switch ${
          includeToc ? "toc-toggle__switch--on" : ""
        }`}
        onClick={() => setIncludeToc(!includeToc)}
      >
        <span className="toc-toggle__switch-thumb" />
      </button>
    </div>
  );
};

export default TocToggle;
