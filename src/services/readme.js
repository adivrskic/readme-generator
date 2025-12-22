/**
 * README Generation Service
 * Handles prompt building and API communication for README generation
 */

/**
 * Generates a README for the given repository data
 * @param {Object} repoData - Repository information from GitHub API
 * @param {Array} sections - Array of {id, enabled} section configurations
 * @param {string} tone - Writing tone (professional, friendly, technical, minimal)
 * @param {string} badgeStyle - Shield.io badge style
 * @param {boolean} useEmojis - Whether to include emojis in headers
 * @param {boolean} includeToc - Whether to include table of contents
 * @returns {Promise<string>} Generated README markdown
 */
export const generateReadme = async (
  repoData,
  sections,
  tone = "professional",
  badgeStyle = "flat",
  useEmojis = false,
  includeToc = false
) => {
  // Validate inputs
  if (!repoData || !repoData.name) {
    throw new Error("Invalid repository data provided");
  }

  if (!Array.isArray(sections)) {
    throw new Error("Sections must be an array");
  }

  // sections is now an array of { id, enabled } objects - preserve order
  const enabledSections = sections
    .filter((section) => section.enabled)
    .map((section) => section.id);

  if (enabledSections.length === 0) {
    throw new Error("At least one section must be enabled");
  }

  console.log("[README] Generating README for:", repoData.fullName);
  console.log("[README] Enabled sections:", enabledSections.join(", "));
  console.log("[README] Options:", { tone, badgeStyle, useEmojis, includeToc });

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
    let errorMessage = "Failed to generate README";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.details || errorMessage;
      console.error("[README] API error:", response.status, errorData);
    } catch (parseError) {
      console.error("[README] API error (non-JSON):", response.status);
    }
    throw new Error(`${errorMessage} (Status: ${response.status})`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    console.error("[README] Empty response from API:", data);
    throw new Error(
      "No content generated. The API returned an empty response."
    );
  }

  console.log(
    "[README] Successfully generated README, length:",
    content.length
  );

  // Post-process the content to fix any anchor issues if TOC is enabled
  if (includeToc && useEmojis) {
    return fixTocAnchors(content);
  }

  return content;
};

/**
 * Post-processes README content to fix TOC anchor links for GitHub compatibility
 * GitHub strips emojis from anchors and replaces them with empty strings,
 * resulting in anchors like "#-features" for "## 🚀 Features"
 * @param {string} content - The generated README content
 * @returns {string} Content with fixed anchor links
 */
const fixTocAnchors = (content) => {
  console.log("[README] Post-processing TOC anchors for GitHub compatibility");

  // Extract all headers with emojis
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  const headers = [];
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    headers.push({
      full: match[0],
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  // Build a map of text-based anchors to GitHub-compatible anchors
  const anchorMap = new Map();

  for (const header of headers) {
    // Simple anchor (what we might have generated): lowercase, hyphens for spaces
    const simpleAnchor = header.text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special chars including emojis
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // GitHub anchor: emojis become empty, resulting in leading hyphen
    const githubAnchor = header.text
      .toLowerCase()
      .replace(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/gu, "") // Remove emojis
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    if (simpleAnchor !== githubAnchor && simpleAnchor) {
      anchorMap.set(simpleAnchor, githubAnchor);
    }
  }

  // Replace anchors in TOC links
  let fixedContent = content;
  for (const [simple, github] of anchorMap) {
    // Match markdown links with the simple anchor
    const linkRegex = new RegExp(`\\]\\(#${simple}\\)`, "g");
    fixedContent = fixedContent.replace(linkRegex, `](#${github})`);
  }

  return fixedContent;
};

/**
 * Returns tone-specific writing instructions
 * @param {string} tone - The selected tone
 * @returns {string} Formatted tone instructions for the prompt
 */
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

/**
 * Builds the complete prompt for README generation
 * @param {Object} repoData - Repository data
 * @param {Array} enabledSections - List of enabled section IDs
 * @param {string} tone - Writing tone
 * @param {string} badgeStyle - Badge style
 * @param {boolean} useEmojis - Whether to use emojis
 * @param {boolean} includeToc - Whether to include TOC
 * @returns {string} Complete prompt string
 */
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

  const languageList = Object.entries(repoData.languages || {})
    .sort((a, b) => b[1] - a[1])
    .map(([lang, bytes]) => `${lang}: ${bytes} bytes`)
    .join(", ");

  const configSummary = Object.entries(repoData.configFiles || {})
    .map(([file, content]) => {
      const truncated =
        content.length > 2000
          ? content.substring(0, 2000) + "\n... (truncated)"
          : content;
      return `--- ${file} ---\n${truncated}`;
    })
    .join("\n\n");

  const rootFiles = (repoData.files || [])
    .filter((f) => !f.includes("/"))
    .join(", ");

  const topDirectories = (repoData.directories || [])
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

  // Fixed TOC instructions with proper GitHub anchor format
  const tocInstructions = includeToc
    ? `
TABLE OF CONTENTS: ENABLED
Include a Table of Contents section immediately after the project title/badges.
Format it as a bulleted list with markdown anchor links to each section.

CRITICAL: GitHub anchor format rules:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters except hyphens
${
  useEmojis
    ? `- For headers with emojis like "## 🚀 Features", the anchor becomes "#-features" (emoji is removed, leaving a leading hyphen)
- Example TOC for emoji headers:
  - [🚀 Features](#-features)
  - [📦 Installation](#-installation)
  - [💻 Usage](#-usage)`
    : `- Example TOC:
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)`
}

Make sure the anchor links EXACTLY match how GitHub will render them.
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
- Topics: ${(repoData.topics || []).join(", ") || "None"}
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
