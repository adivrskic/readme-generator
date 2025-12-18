import React from "react";

const SectionOptions = ({ sections, setSections }) => {
  const sectionLabels = {
    badges: "Badges",
    features: "Features",
    installation: "Installation",
    usage: "Usage",
    techStack: "Tech Stack",
    contributing: "Contributing",
    license: "License",
  };

  const handleToggle = (key) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="section-options">
      <h3 className="section-options__title">Include Sections</h3>
      <div className="section-options__grid">
        {Object.entries(sectionLabels).map(([key, label]) => (
          <div key={key} className="section-options__item">
            <input
              type="checkbox"
              id={key}
              checked={sections[key]}
              onChange={() => handleToggle(key)}
            />
            <label htmlFor={key}>{label}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionOptions;
