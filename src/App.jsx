import React, { useState, useEffect } from "react";
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

const App = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [repoInfo, setRepoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [rateLimit, setRateLimit] = useState({ remaining: 60, reset: null });
  const [tone, setTone] = useState("professional");
  const [badgeStyle, setBadgeStyle] = useState("flat");
  const [useEmojis, setUseEmojis] = useState(false);
  const [includeToc, setIncludeToc] = useState(false);
  const [sections, setSections] = useState([
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
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimit(getRateLimit());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRateLimitClass = () => {
    if (rateLimit.remaining <= 5) return "app__rate-limit--danger";
    if (rateLimit.remaining <= 15) return "app__rate-limit--warning";
    return "";
  };

  const getRateLimitPercent = () => {
    return Math.max(0, Math.min(100, (rateLimit.remaining / 60) * 100));
  };

  const handleSubmit = async () => {
    const parsed = parseGitHubUrl(repoUrl);

    if (!parsed) {
      setError(
        "Invalid GitHub URL. Use format: owner/repo or https://github.com/owner/repo"
      );
      return;
    }

    setError("");
    setLoading(true);
    setReadme("");
    setRepoInfo(null);

    try {
      const repoData = await fetchRepoData(parsed.owner, parsed.repo, setStage);
      setRepoInfo(repoData);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStage("");
    }
  };

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
              title={`${rateLimit.remaining} requests remaining`}
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
