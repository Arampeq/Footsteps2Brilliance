"use client";

import type { EvaluationResult } from "@/types/evaluation";
import { CONFIDENCE_LEVELS as LEVELS, CONFIDENCE_CONFIG as CONFIG } from "./constants";

function ConfidenceMeter({ level }: { level: EvaluationResult["confidence"] }) {
  const activeIndex = LEVELS.indexOf(level);
  return (
    <div
      className="flex gap-1.5"
      role="meter"
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-label={`Confidence: ${CONFIG[level].label}`}
    >
      {LEVELS.map((l, i) => (
        <div
          key={l}
          className={`h-2 w-10 rounded-full transition-colors ${
            i <= activeIndex ? CONFIG[level].bar : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

interface Props {
  confidence: EvaluationResult["confidence"];
  confidenceNote: string | null;
  uncertainties: string[];
}

function ConfidenceBadge({ confidence }: { confidence: EvaluationResult["confidence"] }) {
  const cfg = CONFIG[confidence];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}
    >
      {cfg.label}
    </span>
  );
}

export default function ConfidenceSection({
  confidence,
  confidenceNote,
  uncertainties,
}: Props) {
  const cfg = CONFIG[confidence];
  const hasUncertainties = uncertainties.length > 0;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.panel}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h3 className={`font-semibold ${cfg.heading}`}>AI confidence</h3>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <ConfidenceMeter level={confidence} />
      <p className="text-sm text-slate-600 mt-2">{cfg.description}</p>

      {confidenceNote && (
        <p className="text-sm text-slate-700 mt-3 leading-relaxed border-t border-slate-200/80 pt-3">
          {confidenceNote}
        </p>
      )}

      {hasUncertainties && (
        <div className="mt-4 border-t border-slate-200/80 pt-4">
          <h4 className="text-sm font-semibold text-slate-800 mb-2">
            Where this evaluation may be uncertain
          </h4>
          <ul className="flex flex-col gap-2 list-disc list-inside text-sm text-slate-700">
            {uncertainties.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            These items are AI-generated caveats — use your judgment alongside the rubric.
          </p>
        </div>
      )}

      {confidence === "high" && !confidenceNote && !hasUncertainties && (
        <p className="text-xs text-slate-500 mt-3">
          No specific reliability concerns were flagged for this book.
        </p>
      )}
    </div>
  );
}
