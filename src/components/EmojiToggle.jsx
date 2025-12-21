import React from "react";
import { Smile } from "lucide-react";

const EmojiToggle = ({ useEmojis, setUseEmojis }) => {
  return (
    <div className="emoji-toggle">
      <div className="emoji-toggle__info">
        <Smile className="emoji-toggle__icon" />
        <div className="emoji-toggle__text">
          <span className="emoji-toggle__label">Section Emojis</span>
          <span className="emoji-toggle__preview">
            {useEmojis ? "## 🚀 Features" : "## Features"}
          </span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={useEmojis}
        className={`emoji-toggle__switch ${
          useEmojis ? "emoji-toggle__switch--on" : ""
        }`}
        onClick={() => setUseEmojis(!useEmojis)}
      >
        <span className="emoji-toggle__switch-thumb" />
      </button>
    </div>
  );
};

export default EmojiToggle;
