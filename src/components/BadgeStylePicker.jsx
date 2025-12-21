import React from "react";

const BadgeStylePicker = ({ badgeStyle, setBadgeStyle }) => {
  const styles = [
    { id: "flat", label: "Flat" },
    { id: "flat-square", label: "Square" },
    { id: "plastic", label: "Plastic" },
    { id: "for-the-badge", label: "Large" },
  ];

  return (
    <div className="badge-style-picker">
      <h3 className="badge-style-picker__title">Badge Style</h3>
      <div className="badge-style-picker__options">
        {styles.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`badge-style-picker__option ${
              badgeStyle === id ? "badge-style-picker__option--active" : ""
            }`}
            onClick={() => setBadgeStyle(id)}
          >
            <div
              className={`badge-style-picker__preview badge-style-picker__preview--${id}`}
            >
              <span className="badge-style-picker__preview-left">style</span>
              <span className="badge-style-picker__preview-right">{id}</span>
            </div>
            <span className="badge-style-picker__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BadgeStylePicker;
