import { kbArticleSchema, scenarioSchema, trackSchema } from "@/content/schema";
import { kbArticles } from "@/content/kb/articles";
import { curriculum } from "@/content/curriculum";
import { scenarioList } from "@/content/scenarios";

export function validateContent() {
  const errors: string[] = [];

  const scenarioIds = new Set<string>();
  for (const raw of scenarioList) {
    const parsed = scenarioSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`Scenario ${raw?.id ?? "?"}: ${parsed.error.message}`);
      continue;
    }
    if (scenarioIds.has(parsed.data.id)) {
      errors.push(`Duplicate scenario id: ${parsed.data.id}`);
    }
    scenarioIds.add(parsed.data.id);
  }

  const kbIds = new Set<string>();
  for (const raw of kbArticles) {
    const parsed = kbArticleSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`KB ${raw?.id ?? "?"}: ${parsed.error.message}`);
      continue;
    }
    if (kbIds.has(parsed.data.id)) {
      errors.push(`Duplicate KB id: ${parsed.data.id}`);
    }
    kbIds.add(parsed.data.id);
  }

  for (const raw of curriculum) {
    const parsed = trackSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`Track ${raw?.id}: ${parsed.error.message}`);
    }
  }

  // Link integrity
  for (const raw of scenarioList) {
    const parsed = scenarioSchema.safeParse(raw);
    if (!parsed.success) continue;
    for (const link of parsed.data.knowledgeLinks) {
      if (!kbIds.has(link)) {
        errors.push(`Scenario ${parsed.data.id} links unknown KB: ${link}`);
      }
    }
    for (const pre of parsed.data.prerequisites) {
      if (!scenarioIds.has(pre)) {
        errors.push(`Scenario ${parsed.data.id} has unknown prerequisite: ${pre}`);
      }
    }
  }

  for (const article of kbArticles) {
    for (const sid of article.relatedScenarios) {
      if (!scenarioIds.has(sid)) {
        errors.push(`KB ${article.id} related unknown scenario: ${sid}`);
      }
    }
    for (const aid of article.relatedArticles) {
      if (!kbIds.has(aid)) {
        errors.push(`KB ${article.id} related unknown article: ${aid}`);
      }
    }
  }

  for (const track of curriculum) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        for (const sid of topic.scenarioIds) {
          if (!scenarioIds.has(sid)) {
            errors.push(`Curriculum topic ${topic.id} unknown scenario: ${sid}`);
          }
        }
        for (const aid of topic.articleIds) {
          if (!kbIds.has(aid)) {
            errors.push(`Curriculum topic ${topic.id} unknown article: ${aid}`);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, scenarioIds: [...scenarioIds], kbIds: [...kbIds] };
}

export function getScenarios() {
  return scenarioList.map((s) => scenarioSchema.parse(s));
}

export function getScenario(id: string) {
  const raw = scenarioList.find((s) => s.id === id);
  if (!raw) return undefined;
  return scenarioSchema.parse(raw);
}

export function getArticle(id: string) {
  const raw = kbArticles.find((a) => a.id === id);
  if (!raw) return undefined;
  return kbArticleSchema.parse(raw);
}

export function getCurriculum() {
  return curriculum.map((t) => trackSchema.parse(t));
}
