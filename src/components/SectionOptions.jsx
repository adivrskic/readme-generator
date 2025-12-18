import React from "react";
import {
  Award,
  Zap,
  Download,
  PlayCircle,
  Layers,
  GitPullRequest,
  Scale,
  BookOpen,
  Image,
  Map,
  HelpCircle,
  Shield,
  Settings,
  FlaskConical,
} from "lucide-react";

const SectionOptions = ({ sections, setSections }) => {
  const sectionConfig = {
    badges: { label: "Badges", icon: Award },
    features: { label: "Features", icon: Zap },
    installation: { label: "Installation", icon: Download },
    usage: { label: "Usage", icon: PlayCircle },
    techStack: { label: "Tech Stack", icon: Layers },
    apiReference: { label: "API", icon: BookOpen },
    configuration: { label: "Config", icon: Settings },
    screenshots: { label: "Screenshots", icon: Image },
    testing: { label: "Testing", icon: FlaskConical },
    roadmap: { label: "Roadmap", icon: Map },
    faq: { label: "FAQ", icon: HelpCircle },
    contributing: { label: "Contributing", icon: GitPullRequest },
    security: { label: "Security", icon: Shield },
    license: { label: "License", icon: Scale },
  };

  const handleToggle = (key) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="section-options">
      <h3 className="section-options__title">Sections</h3>
      <div className="section-options__grid">
        {Object.entries(sectionConfig).map(([key, { label, icon: Icon }]) => (
          <button
            key={key}
            type="button"
            className={`section-options__pill ${
              sections[key] ? "section-options__pill--active" : ""
            }`}
            onClick={() => handleToggle(key)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SectionOptions;
