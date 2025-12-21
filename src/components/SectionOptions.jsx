import React, { useState, useRef, useEffect } from "react";
import {
  Award,
  Zap,
  Download,
  PlayCircle,
  Layers,
  GitPullRequest,
  Scale,
  BookOpen,
  Map,
  HelpCircle,
  Shield,
  Settings,
  FlaskConical,
  GripVertical,
  ChevronDown,
  Package,
  Terminal,
  Globe,
  Server,
  Puzzle,
  FileCode,
} from "lucide-react";

const presets = [
  {
    id: "library",
    label: "Library",
    icon: Package,
    sections: [
      { id: "badges", enabled: true },
      { id: "features", enabled: true },
      { id: "installation", enabled: true },
      { id: "usage", enabled: true },
      { id: "apiReference", enabled: true },
      { id: "techStack", enabled: true },
      { id: "configuration", enabled: false },
      { id: "testing", enabled: true },
      { id: "roadmap", enabled: false },
      { id: "faq", enabled: false },
      { id: "contributing", enabled: true },
      { id: "security", enabled: false },
      { id: "license", enabled: true },
    ],
  },
  {
    id: "cli",
    label: "CLI Tool",
    icon: Terminal,
    sections: [
      { id: "badges", enabled: true },
      { id: "features", enabled: true },
      { id: "installation", enabled: true },
      { id: "usage", enabled: true },
      { id: "configuration", enabled: true },
      { id: "apiReference", enabled: false },
      { id: "techStack", enabled: false },
      { id: "testing", enabled: false },
      { id: "roadmap", enabled: false },
      { id: "faq", enabled: true },
      { id: "contributing", enabled: true },
      { id: "security", enabled: false },
      { id: "license", enabled: true },
    ],
  },
  {
    id: "webapp",
    label: "Web App",
    icon: Globe,
    sections: [
      { id: "badges", enabled: true },
      { id: "features", enabled: true },
      { id: "techStack", enabled: true },
      { id: "installation", enabled: true },
      { id: "usage", enabled: true },
      { id: "configuration", enabled: true },
      { id: "apiReference", enabled: false },
      { id: "testing", enabled: false },
      { id: "roadmap", enabled: true },
      { id: "faq", enabled: false },
      { id: "contributing", enabled: true },
      { id: "security", enabled: false },
      { id: "license", enabled: true },
    ],
  },
  {
    id: "api",
    label: "API Service",
    icon: Server,
    sections: [
      { id: "badges", enabled: true },
      { id: "features", enabled: true },
      { id: "installation", enabled: true },
      { id: "configuration", enabled: true },
      { id: "apiReference", enabled: true },
      { id: "usage", enabled: true },
      { id: "techStack", enabled: true },
      { id: "testing", enabled: true },
      { id: "roadmap", enabled: false },
      { id: "faq", enabled: false },
      { id: "contributing", enabled: true },
      { id: "security", enabled: true },
      { id: "license", enabled: true },
    ],
  },
  {
    id: "plugin",
    label: "Plugin",
    icon: Puzzle,
    sections: [
      { id: "badges", enabled: true },
      { id: "features", enabled: true },
      { id: "installation", enabled: true },
      { id: "usage", enabled: true },
      { id: "configuration", enabled: true },
      { id: "apiReference", enabled: false },
      { id: "techStack", enabled: false },
      { id: "testing", enabled: false },
      { id: "roadmap", enabled: false },
      { id: "faq", enabled: true },
      { id: "contributing", enabled: true },
      { id: "security", enabled: false },
      { id: "license", enabled: true },
    ],
  },
  {
    id: "docs",
    label: "Docs",
    icon: FileCode,
    sections: [
      { id: "badges", enabled: false },
      { id: "features", enabled: true },
      { id: "installation", enabled: true },
      { id: "usage", enabled: true },
      { id: "faq", enabled: true },
      { id: "roadmap", enabled: true },
      { id: "contributing", enabled: true },
      { id: "apiReference", enabled: false },
      { id: "techStack", enabled: false },
      { id: "configuration", enabled: false },
      { id: "testing", enabled: false },
      { id: "security", enabled: false },
      { id: "license", enabled: true },
    ],
  },
];

const SectionOptions = ({ sections, setSections }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const iconMap = {
    badges: Award,
    features: Zap,
    installation: Download,
    usage: PlayCircle,
    techStack: Layers,
    apiReference: BookOpen,
    configuration: Settings,
    testing: FlaskConical,
    roadmap: Map,
    faq: HelpCircle,
    contributing: GitPullRequest,
    security: Shield,
    license: Scale,
  };

  const labelMap = {
    badges: "Badges",
    features: "Features",
    installation: "Installation",
    usage: "Usage",
    techStack: "Tech Stack",
    apiReference: "API",
    configuration: "Config",
    testing: "Testing",
    roadmap: "Roadmap",
    faq: "FAQ",
    contributing: "Contributing",
    security: "Security",
    license: "License",
  };

  const handleToggle = (id) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    );
  };

  const handleApplyPreset = (presetSections) => {
    setSections(presetSections);
    setPresetOpen(false);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setSections((prev) => {
      const newSections = [...prev];
      const [draggedItem] = newSections.splice(draggedIndex, 1);
      newSections.splice(dropIndex, 0, draggedItem);
      return newSections;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="section-options">
      <div className="section-options__header">
        <h3 className="section-options__title">Sections</h3>
        <div className="section-options__actions">
          <span className="section-options__hint">Drag to reorder</span>
          <div className="section-options__preset-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="section-options__preset-trigger"
              onClick={() => setPresetOpen(!presetOpen)}
            >
              Presets
              <ChevronDown className={presetOpen ? "rotate" : ""} />
            </button>
            {presetOpen && (
              <div className="section-options__preset-menu">
                {presets.map(
                  ({ id, label, icon: Icon, sections: presetSections }) => (
                    <button
                      key={id}
                      type="button"
                      className="section-options__preset-item"
                      onClick={() => handleApplyPreset(presetSections)}
                    >
                      <Icon />
                      {label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="section-options__list">
        {sections.map((section, index) => {
          const Icon = iconMap[section.id];
          const label = labelMap[section.id];
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          if (!Icon) return null;

          return (
            <div
              key={section.id}
              className={`section-options__item ${
                section.enabled ? "section-options__item--active" : ""
              } ${isDragging ? "section-options__item--dragging" : ""} ${
                isDragOver ? "section-options__item--drag-over" : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="section-options__item-drag">
                <GripVertical />
              </div>
              <button
                type="button"
                className="section-options__item-toggle"
                onClick={() => handleToggle(section.id)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionOptions;
