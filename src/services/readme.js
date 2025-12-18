export const generateReadme = async (repoData, sections) => {
  const enabledSections = Object.entries(sections)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  const prompt = buildPrompt(repoData, enabledSections);

  const response = await fetch("/.netlify/functions/generate-readme", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate README. Please try again.");
  }

  const data = await response.json();
  const content = data.content[0]?.text;

  if (!content) {
    throw new Error("No content generated. Please try again.");
  }

  return content;
};

const buildPrompt = (repoData, enabledSections) => {
  const sectionDescriptions = {
    badges: "Badges (stars, forks, license, language shields.io badges)",
    features: "Features section highlighting key capabilities",
    installation: "Installation instructions with commands",
    usage: "Usage examples with code snippets",
    techStack: "Tech stack / dependencies list",
    apiReference: "API Reference with endpoints or methods",
    configuration: "Configuration options and environment variables",
    screenshots: "Screenshots section with placeholder image syntax",
    testing: "Testing instructions and commands",
    roadmap: "Roadmap with planned features",
    faq: "FAQ section with common questions",
    contributing: "Contributing guidelines",
    security: "Security policy and reporting vulnerabilities",
    license: "License section",
  };

  const requestedSections = enabledSections
    .map((s) => sectionDescriptions[s])
    .filter(Boolean)
    .join(", ");

  const languageList = Object.entries(repoData.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, bytes]) => `${lang}: ${bytes} bytes`)
    .join(", ");

  const configSummary = Object.entries(repoData.configFiles)
    .map(([file, content]) => {
      const truncated =
        content.length > 2000
          ? content.substring(0, 2000) + "\n... (truncated)"
          : content;
      return `--- ${file} ---\n${truncated}`;
    })
    .join("\n\n");

  const rootFiles = repoData.files.filter((f) => !f.includes("/")).join(", ");

  const topDirectories = repoData.directories
    .filter((d) => !d.includes("/"))
    .join(", ");

  return `Generate a professional README.md file for this GitHub repository.

REPOSITORY INFO:
- Name: ${repoData.name}
- Full name: ${repoData.fullName}
- Description: ${repoData.description || "No description provided"}
- Owner: ${repoData.owner}
- Stars: ${repoData.stars}
- Forks: ${repoData.forks}
- License: ${repoData.license || "Not specified"}
- Topics: ${repoData.topics.join(", ") || "None"}
- Homepage: ${repoData.homepage || "None"}
- Default branch: ${repoData.defaultBranch}

LANGUAGES:
${languageList || "Not available"}

ROOT FILES:
${rootFiles || "Not available"}

TOP-LEVEL DIRECTORIES:
${topDirectories || "Not available"}

CONFIG FILES:
${configSummary || "None found"}

REQUESTED SECTIONS: ${requestedSections}

INSTRUCTIONS:
1. Generate ONLY the sections requested above
2. Make it professional and well-formatted
3. Infer the project's purpose from the available information
4. For installation, use appropriate commands based on the detected package manager/language
5. For usage, provide realistic examples based on what the project appears to do
6. Use shields.io badge format if badges are requested
7. For screenshots section, use placeholder syntax: ![Screenshot](screenshots/screenshot.png)
8. For API reference, infer endpoints or methods from the codebase structure
9. For configuration, list environment variables or config options if detectable
10. Output ONLY the raw markdown, no explanations or code fences`;
};
