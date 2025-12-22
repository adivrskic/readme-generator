import React, { useState, useEffect, useCallback } from "react";
import { Github } from "lucide-react";
import RepoInput from "./components/RepoInput";
import SectionOptions from "./components/SectionOptions";
import ToneSelector from "./components/ToneSelector";
import BadgeStylePicker from "./components/BadgeStylePicker";
import TocToggle from "./components/TocToggle";
import EmojiToggle from "./components/EmojiToggle";
import ReadmeOutput from "./components/ReadmeOutput";
import ReadmePlaceholder from "./components/ReadmePlaceholder";
import { parseGitHubUrl, fetchRepoData, getRateLimit } from "./services/github";
import { generateReadme } from "./services/readme";
import "./styles/main.scss";

// Local storage keys
const STORAGE_KEYS = {
  TONE: "readme-gen-tone",
  BADGE_STYLE: "readme-gen-badge-style",
  USE_EMOJIS: "readme-gen-use-emojis",
  INCLUDE_TOC: "readme-gen-include-toc",
  SECTIONS: "readme-gen-sections",
  LAST_REPO: "readme-gen-last-repo",
};

// Default sections configuration
const DEFAULT_SECTIONS = [
  { id: "badges", enabled: true },
  { id: "features", enabled: true },
  { id: "installation", enabled: true },
  { id: "usage", enabled: true },
  { id: "techStack", enabled: true },
  { id: "apiReference", enabled: false },
  { id: "configuration", enabled: false },
  { id: "testing", enabled: false },
  { id: "roadmap", enabled: false },
  { id: "faq", enabled: false },
  { id: "contributing", enabled: true },
  { id: "security", enabled: false },
  { id: "license", enabled: true },
];

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found or error
 * @returns {any} Stored value or default
 */
const getStoredValue = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;

    // Handle boolean strings
    if (stored === "true") return true;
    if (stored === "false") return false;

    // Try to parse as JSON for objects/arrays
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  } catch (error) {
    console.warn(`[App] Failed to read from localStorage: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Safely set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
const setStoredValue = (key, value) => {
  try {
    const toStore =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    localStorage.setItem(key, toStore);
  } catch (error) {
    console.warn(`[App] Failed to write to localStorage: ${key}`, error);
  }
};

/**
 * Merges stored sections with defaults to handle new sections added in updates
 * @param {Array} storedSections - Sections from localStorage
 * @param {Array} defaultSections - Default sections configuration
 * @returns {Array} Merged sections
 */
const mergeSections = (storedSections, defaultSections) => {
  if (!Array.isArray(storedSections)) return defaultSections;

  // Create a map of stored sections
  const storedMap = new Map(storedSections.map((s) => [s.id, s]));

  // Merge: use stored values where available, add new defaults
  const merged = defaultSections.map((defaultSection) => {
    const stored = storedMap.get(defaultSection.id);
    return stored || defaultSection;
  });

  return merged;
};

const App = () => {
  // Initialize state from localStorage with defaults
  const [repoUrl, setRepoUrl] = useState(() =>
    getStoredValue(STORAGE_KEYS.LAST_REPO, "")
  );
  const [readme, setReadme] = useState("");
  const [repoInfo, setRepoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [rateLimit, setRateLimit] = useState({ remaining: 6, reset: null });

  // Persisted settings
  const [tone, setTone] = useState(() =>
    getStoredValue(STORAGE_KEYS.TONE, "professional")
  );
  const [badgeStyle, setBadgeStyle] = useState(() =>
    getStoredValue(STORAGE_KEYS.BADGE_STYLE, "flat")
  );
  const [useEmojis, setUseEmojis] = useState(() =>
    getStoredValue(STORAGE_KEYS.USE_EMOJIS, false)
  );
  const [includeToc, setIncludeToc] = useState(() =>
    getStoredValue(STORAGE_KEYS.INCLUDE_TOC, false)
  );
  const [sections, setSections] = useState(() =>
    mergeSections(getStoredValue(STORAGE_KEYS.SECTIONS, null), DEFAULT_SECTIONS)
  );

  // Persist settings to localStorage when they change
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.TONE, tone);
  }, [tone]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.BADGE_STYLE, badgeStyle);
  }, [badgeStyle]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.USE_EMOJIS, useEmojis);
  }, [useEmojis]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.INCLUDE_TOC, includeToc);
  }, [includeToc]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SECTIONS, sections);
  }, [sections]);

  // Poll rate limit less aggressively (every 5 seconds instead of 1)
  useEffect(() => {
    // Initial fetch
    setRateLimit(getRateLimit());

    const interval = setInterval(() => {
      setRateLimit(getRateLimit());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRateLimitClass = useCallback(() => {
    if (rateLimit.remaining <= 2) return "app__rate-limit--danger";
    if (rateLimit.remaining <= 4) return "app__rate-limit--warning";
    return "";
  }, [rateLimit.remaining]);

  const getRateLimitPercent = useCallback(() => {
    return Math.max(0, Math.min(100, (rateLimit.remaining / 60) * 100));
  }, [rateLimit.remaining]);

  const handleSubmit = async () => {
    const parsed = parseGitHubUrl(repoUrl);

    if (!parsed) {
      setError(
        "Invalid GitHub URL. Use format: owner/repo or https://github.com/owner/repo"
      );
      return;
    }

    // Save the repo URL for next time
    setStoredValue(STORAGE_KEYS.LAST_REPO, repoUrl);

    setError("");
    setLoading(true);
    setReadme("");
    setRepoInfo(null);

    console.log(
      "[App] Starting README generation for:",
      `${parsed.owner}/${parsed.repo}`
    );
    const startTime = Date.now();

    try {
      const repoData = await fetchRepoData(parsed.owner, parsed.repo, setStage);
      setRepoInfo(repoData);

      // Update rate limit immediately after fetch
      setRateLimit(getRateLimit());

      setStage("Generating README...");
      const generatedReadme = await generateReadme(
        repoData,
        sections,
        tone,
        badgeStyle,
        useEmojis,
        includeToc
      );

      setReadme(generatedReadme);

      const elapsed = Date.now() - startTime;
      console.log(`[App] README generation complete in ${elapsed}ms`);
    } catch (err) {
      console.error("[App] Generation failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  // Handle keyboard shortcut (Cmd/Ctrl + Enter) to submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        repoUrl.trim() &&
        !loading
      ) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [repoUrl, loading, sections, tone, badgeStyle, useEmojis, includeToc]);

  return (
    <div className="app">
      <div className="app__left">
        <div className="app__sticky">
          <header className="app__header">
            <div className="app__header-top">
              <div className="app__logo">
                <Github size={20} />
              </div>
              <div className="app__header-text">
                <h1>README Generator</h1>
                <p>Generate READMEs from GitHub repos</p>
              </div>
            </div>
            <div
              className={`app__rate-limit ${getRateLimitClass()}`}
              title={`GitHub API: ${rateLimit.remaining} requests remaining${
                rateLimit.reset
                  ? ` (resets ${rateLimit.reset.toLocaleTimeString()})`
                  : ""
              }`}
            >
              <div className="app__rate-limit-dot" />
              <div className="app__rate-limit-bar">
                <div
                  className="app__rate-limit-bar-fill"
                  style={{ width: `${getRateLimitPercent()}%` }}
                />
              </div>
            </div>
          </header>

          <RepoInput
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            stage={stage}
          />
        </div>

        <div className="app__scrollable">
          <SectionOptions sections={sections} setSections={setSections} />

          <div className="app__options-grid">
            <ToneSelector tone={tone} setTone={setTone} />
            <BadgeStylePicker
              badgeStyle={badgeStyle}
              setBadgeStyle={setBadgeStyle}
            />
            <TocToggle includeToc={includeToc} setIncludeToc={setIncludeToc} />
            <EmojiToggle useEmojis={useEmojis} setUseEmojis={setUseEmojis} />
          </div>
        </div>
      </div>

      <div className="app__right">
        {readme ? (
          <ReadmeOutput readme={readme} repoInfo={repoInfo} />
        ) : (
          <ReadmePlaceholder loading={loading} />
        )}
      </div>
    </div>
  );
};

export default App;
