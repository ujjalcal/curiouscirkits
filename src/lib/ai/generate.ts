import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  portfolioContentSchema,
  type PortfolioContent,
} from "@/lib/content-schema";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a portfolio content generator for students and new graduates.
Write professional, concise copy that makes the person sound competent and approachable.
Always include at least a hero section and one other section.
Tailor the tone to a young professional entering their career.`;

/**
 * Generate portfolio content from pasted LinkedIn / resume text.
 */
export async function generateFromText(text: string): Promise<PortfolioContent> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: portfolioContentSchema,
    system: SYSTEM_PROMPT,
    prompt: `Generate a portfolio website from this person's profile text:\n\n${text}`,
    temperature: 0.7,
  });

  return object;
}

/**
 * Generate portfolio content from the 5-question onboarding wizard answers.
 */
export async function generateFromAnswers(answers: {
  name: string;
  role: string;
  about: string;
  projects: string;
  skills: string;
}): Promise<PortfolioContent> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: portfolioContentSchema,
    system: SYSTEM_PROMPT,
    prompt: `Generate a portfolio website for this person:

Name: ${answers.name}
Role: ${answers.role}
About: ${answers.about}
Projects: ${answers.projects}
Skills: ${answers.skills}`,
    temperature: 0.7,
  });

  return object;
}
