import React from "react";
import { Briefcase, Smile, Code, Minus } from "lucide-react";

const ToneSelector = ({ tone, setTone }) => {
  const tones = [
    {
      id: "professional",
      label: "Professional",
      icon: Briefcase,
      description: "Formal and polished",
    },
    {
      id: "friendly",
      label: "Friendly",
      icon: Smile,
      description: "Warm and approachable",
    },
    {
      id: "technical",
      label: "Technical",
      icon: Code,
      description: "Detailed and precise",
    },
    {
      id: "minimal",
      label: "Minimal",
      icon: Minus,
      description: "Brief and concise",
    },
  ];

  return (
    <div className="tone-selector">
      <h3 className="tone-selector__title">Tone</h3>
      <div className="tone-selector__options">
        {tones.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            type="button"
            className={`tone-selector__option ${
              tone === id ? "tone-selector__option--active" : ""
            }`}
            onClick={() => setTone(id)}
          >
            <div className="tone-selector__option-icon">
              <Icon />
            </div>
            <div className="tone-selector__option-content">
              <span className="tone-selector__option-label">{label}</span>
              <span className="tone-selector__option-desc">{description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToneSelector;
