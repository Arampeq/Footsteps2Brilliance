import type { EvaluationFocus } from "@/types/evaluation";


export const FOCUS_OPTIONS: { value: EvaluationFocus; label: string }[] = [
  { value: "balanced",      label: "Balanced" },
  { value: "creativity",    label: "Creativity" },
  { value: "language",      label: "Language" },
  { value: "structure",     label: "Structure" },
  { value: "illustrations", label: "Illustrations" },
  { value: "effort",        label: "Effort" },
];


export const RUBRIC_LABELS: Record<string, { label: string; hint: string }> = {
  contentStructure:        { label: "Content Structure",         hint: "Story arc, organized facts, or clear steps" },
  languageAndVocabulary:   { label: "Language & Vocabulary",     hint: "Word choice, sentences, spelling for grade level" },
  illustrationTextHarmony: { label: "Illustration–Text Harmony", hint: "How well pictures and words reinforce each other" },
  creativityAndVoice:      { label: "Creativity & Voice",        hint: "Originality, personality, unique perspective" },
  effortAndDepth:          { label: "Effort & Depth",            hint: "Depth of engagement and idea development" },
};


export const GENRE_COLORS: Record<string, string> = {
  "Fiction":            "bg-violet-100 text-violet-800 border-violet-300",
  "Non-fiction":        "bg-blue-100 text-blue-800 border-blue-300",
  "Instructional":      "bg-teal-100 text-teal-800 border-teal-300",
  "Personal Narrative": "bg-rose-100 text-rose-800 border-rose-300",
  "Other":              "bg-slate-100 text-slate-700 border-slate-300",
};


export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const CONFIDENCE_CONFIG = {
  high: {
    label: "High confidence",
    description: "Text and images were clear; scores are likely reliable.",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    bar: "bg-emerald-500",
    panel: "bg-slate-50 border-slate-200",
    heading: "text-slate-800",
  },
  medium: {
    label: "Moderate confidence",
    description: "Some content was unclear; review flagged items below.",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    bar: "bg-amber-500",
    panel: "bg-amber-50/50 border-amber-200",
    heading: "text-amber-900",
  },
  low: {
    label: "Low confidence",
    description: "Much of the book was hard to read; treat scores as approximate.",
    badge: "bg-red-100 text-red-800 border-red-300",
    bar: "bg-red-500",
    panel: "bg-red-50/50 border-red-200",
    heading: "text-red-900",
  },
};
