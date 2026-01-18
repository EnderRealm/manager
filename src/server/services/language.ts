import linguist from "linguist-js";
import { logger } from "../lib/logger.ts";

export interface LanguageStats {
  primary: string;
  breakdown: Record<string, number>;
}

const cache = new Map<string, { stats: LanguageStats; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getLanguageStats(
  projectPath: string
): Promise<LanguageStats> {
  const cached = cache.get(projectPath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.stats;
  }

  try {
    const result = await linguist(projectPath, {
      ignoredLanguages: ["Markdown", "JSON", "YAML", "Text"],
    });

    const breakdown: Record<string, number> = {};
    let primary = "Unknown";
    let maxBytes = 0;

    for (const [lang, data] of Object.entries(result.languages.results)) {
      const bytes = data.bytes;
      breakdown[lang] = bytes;
      if (bytes > maxBytes) {
        maxBytes = bytes;
        primary = lang;
      }
    }

    const stats: LanguageStats = { primary, breakdown };
    cache.set(projectPath, { stats, timestamp: Date.now() });

    logger.debug({ projectPath, primary }, "Language detected");
    return stats;
  } catch (err) {
    logger.warn({ projectPath, err }, "Language detection failed");
    return { primary: "Unknown", breakdown: {} };
  }
}
