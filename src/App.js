import React, { useState, useEffect } from "react";
import { Github } from "lucide-react";
import RepoInput from "./components/RepoInput";
import SectionOptions from "./components/SectionOptions";
import ReadmeOutput from "./components/ReadmeOutput";
import { parseGitHubUrl, fetchRepoData, getRateLimit } from "./services/github";
import { generateReadme } from "./services/readme";
import "./styles/main.scss";

const App = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [readme, setReadme] = useState("");
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
    contributing: true,
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

    try {
      const repoData = await fetchRepoData(parsed.owner, parsed.repo, setStage);

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
      <header className="app__header">
        <h1>
          <Github size={36} />
          README Generator
        </h1>
        <p>Generate a complete README from any public GitHub repository</p>
      </header>

      <div className={`app__rate-limit ${getRateLimitClass()}`}>
        API requests remaining: {rateLimit.remaining}/60
      </div>

      <RepoInput
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        stage={stage}
      />

      <SectionOptions sections={sections} setSections={setSections} />

      <ReadmeOutput readme={readme} />
    </div>
  );
};

export default App;
