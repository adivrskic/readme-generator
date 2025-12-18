import React, { useState, useEffect } from "react";
import { Github } from "lucide-react";
import RepoInput from "./components/RepoInput";
import SectionOptions from "./components/SectionOptions";
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
  const [sections, setSections] = useState({
    badges: true,
    features: true,
    installation: true,
    usage: true,
    techStack: true,
    apiReference: false,
    configuration: false,
    screenshots: false,
    testing: false,
    roadmap: false,
    faq: false,
    contributing: true,
    security: false,
    license: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimit(getRateLimit());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      const generatedReadme = await generateReadme(repoData, sections);

      setReadme(generatedReadme);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  const getRateLimitClass = () => {
    if (rateLimit.remaining <= 5) return "app__rate-limit--danger";
    if (rateLimit.remaining <= 15) return "app__rate-limit--warning";
    return "";
  };

  return (
    <div className="app">
      <div className="app__left">
        <header className="app__header">
          <div className="app__logo">
            <Github size={22} />
          </div>
          <h1>README Generator</h1>
          <p>Generate a complete README from any public GitHub repository</p>
          <div className={`app__rate-limit ${getRateLimitClass()}`}>
            {rateLimit.remaining}/60 requests
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

        <SectionOptions sections={sections} setSections={setSections} />
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
