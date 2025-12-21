export const generateReadme = async (
  repoData,
  sections,
  tone = "professional",
  badgeStyle = "flat",
  useEmojis = false,
  includeToc = false
) => {
  // sections is now an array of { id, enabled } objects - preserve order
  const enabledSections = sections
    .filter((section) => section.enabled)
    .map((section) => section.id);

  const prompt = buildPrompt(
    repoData,
    enabledSections,
    tone,
    badgeStyle,
    useEmojis,
    includeToc
  );

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

const getToneInstructions = (tone) => {
  const toneGuides = {
    professional: {
      style: "formal, polished, and business-appropriate",
      guidelines: [
        "Use clear, precise language without being overly casual",
        "Maintain a confident, authoritative voice",
        "Avoid slang, jokes, or overly casual expressions",
        "Structure information in a logical, organized manner",
        "Use complete sentences and proper grammar throughout",
      ],
    },
    friendly: {
      style: "warm, approachable, and conversational",
      guidelines: [
        "Use a welcoming, inclusive tone that makes readers feel at ease",
        "Add encouraging language like 'Let's get started!' or 'You're going to love this'",
        "Use contractions naturally (we're, you'll, it's)",
        "Include friendly calls-to-action",
        "Make complex topics feel accessible and fun",
      ],
    },
    technical: {
      style: "detailed, precise, and developer-focused",
      guidelines: [
        "Include specific technical details, types, and parameters",
        "Use proper technical terminology without oversimplifying",
        "Provide comprehensive code examples with explanations",
        "Document edge cases, errors, and expected behaviors",
        "Assume the reader has technical expertise",
      ],
    },
    minimal: {
      style: "brief, concise, and to-the-point",
      guidelines: [
        "Use the fewest words possible while remaining clear",
        "Avoid unnecessary adjectives and filler phrases",
        "Prefer bullet points over paragraphs where appropriate",
        "Skip lengthy explanations—just the essentials",
        "Every sentence should provide direct value",
      ],
    },
  };

  const selected = toneGuides[tone] || toneGuides.professional;

  return `
WRITING TONE: ${selected.style.toUpperCase()}

Tone Guidelines:
${selected.guidelines.map((g) => `- ${g}`).join("\n")}
`;
};

const buildPrompt = (
  repoData,
  enabledSections,
  tone,
  badgeStyle,
  useEmojis,
  includeToc
) => {
  const sectionDescriptions = {
    badges: "Badges (stars, forks, license, language shields.io badges)",
    features: "Features section highlighting key capabilities",
    installation: "Installation instructions with commands",
    usage: "Usage examples with code snippets",
    techStack: "Tech stack / dependencies list",
    apiReference: "API Reference with endpoints or methods",
    configuration: "Configuration options and environment variables",
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

  const toneInstructions = getToneInstructions(tone);

  const badgeInstructions = `
BADGE STYLE: ${badgeStyle}
When generating shields.io badges, use the style parameter: ?style=${badgeStyle}
Example format: ![Stars](https://img.shields.io/github/stars/${repoData.fullName}?style=${badgeStyle})
`;

  const emojiInstructions = useEmojis
    ? `
EMOJI FORMATTING: ENABLED
Add relevant emojis to section headers to make them visually engaging.
Examples:
- ## 🚀 Features
- ## 📦 Installation
- ## 💻 Usage
- ## 🛠️ Tech Stack
- ## 📖 API Reference
- ## ⚙️ Configuration
- ## 🧪 Testing
- ## 🗺️ Roadmap
- ## ❓ FAQ
- ## 🤝 Contributing
- ## 🔒 Security
- ## 📄 License
`
    : `
EMOJI FORMATTING: DISABLED
Do NOT use any emojis in section headers. Keep headers plain text only.
Example: "## Features" not "## 🚀 Features"
`;

  const tocInstructions = includeToc
    ? `
TABLE OF CONTENTS: ENABLED
Include a Table of Contents section immediately after the project title/badges.
Format it as a bulleted list with markdown anchor links to each section.
Example:
## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)

Make sure the anchor links match the actual section headers (lowercase, hyphens for spaces).
${
  useEmojis
    ? "Note: Anchor links should NOT include emojis, just the text portion."
    : ""
}
`
    : "";

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

REQUESTED SECTIONS (in order): ${requestedSections}
${toneInstructions}${badgeInstructions}${emojiInstructions}${tocInstructions}
INSTRUCTIONS:
1. Generate ONLY the sections requested above, IN THE EXACT ORDER LISTED
2. Make it professional and well-formatted
3. Infer the project's purpose from the available information
4. For installation, use appropriate commands based on the detected package manager/language
5. For usage, provide realistic examples based on what the project appears to do
6. Use shields.io badge format if badges are requested, with the specified style parameter
7. For API reference, infer endpoints or methods from the codebase structure
8. For configuration, list environment variables or config options if detectable
9. IMPORTANT: Follow the tone guidelines strictly throughout the entire README
10. Output ONLY the raw markdown, no explanations or code fences`;
};
