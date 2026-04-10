import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { huggingface } from "@ai-sdk/huggingface";
import {
  portfolioContentSchema,
  type PortfolioContent,
} from "@/lib/content-schema";

const SYSTEM_PROMPT = `You generate portfolio website content as JSON. Be specific and concise.

TAGLINE RULES:
- Max 8 words. One concrete fact about this person.
- GOOD: "10,000+ users. One engineer." or "NLP researcher turned startup CTO"
- BAD: "Building scalable tech products" (generic), "Driving innovation" (fluff)
- NEVER use: leverage, driven, passionate, innovative, robust, empower, cutting-edge

HERO SUBHEADING:
- One sentence. State what they do and where, with a specific number or fact.
- GOOD: "Senior Engineer at Twenty. Previously CTO of an acquired startup."
- BAD: "Driving innovation and building robust solutions that deliver real user value."

ABOUT (first person, 2-3 sentences):
- Start with the most impressive fact. No throat-clearing.
- GOOD: "I co-founded a startup that got acquired in 2018, then shipped lead gen tools to 10K+ users."
- BAD: "My journey in software engineering began with an entrepreneurial spirit..."

PROJECTS:
- Use the ACTUAL name of each project/product/company. Not "Startup Co-founder."
- Every company, open-source project, product, research paper, and tool mentioned gets its own entry.
- Description: one sentence, what it does + one concrete metric if available.

SKILLS:
- List EVERY specific technology, framework, API, and tool mentioned. Minimum 6 items.
- Include integration targets (Gmail API, Slack API) as separate skills.

CONTACT:
- Include every URL and email found in the input.

Generate ALL 5 section types: hero, about, projects, skills, contact. No exceptions.`;

function parseAndValidate(raw: string): PortfolioContent {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return portfolioContentSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
}

async function generateWithGemini(prompt: string): Promise<PortfolioContent> {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: portfolioContentSchema,
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.7,
  });
  return object;
}

async function generateWithHuggingFace(prompt: string): Promise<PortfolioContent> {
  const { text } = await generateText({
    model: huggingface("Qwen/Qwen2.5-72B-Instruct"),
    system: SYSTEM_PROMPT + "\n\nOutput ONLY valid JSON. No markdown fences. No explanation.",
    prompt,
    temperature: 0.7,
  });
  return parseAndValidate(text);
}

async function generateWithFallback(prompt: string): Promise<PortfolioContent> {
  // Try Gemini first (fast, structured output)
  try {
    return await generateWithGemini(prompt);
  } catch (geminiError) {
    console.log("[AI] Gemini failed, falling back to HuggingFace:", (geminiError as Error).message?.slice(0, 100));
  }

  // Fallback to HuggingFace Qwen 72B (slower but no rate limits)
  return await generateWithHuggingFace(prompt);
}

export async function generateFromText(text: string): Promise<PortfolioContent> {
  return generateWithFallback(`Generate a portfolio website from this person's profile:\n\n${text}`);
}

export async function generateFromAnswers(answers: {
  name: string;
  role: string;
  about: string;
  projects: string;
  skills: string;
}): Promise<PortfolioContent> {
  return generateWithFallback(`Generate a portfolio website for:

Name: ${answers.name}
Role: ${answers.role}
About: ${answers.about}
Projects: ${answers.projects}
Skills: ${answers.skills}`);
}
