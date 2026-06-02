"use client";

import { useState } from "react";
import { EvaluationResult, EvaluationFocus } from "@/types/evaluation";
import ScoreBar, { scoreLabel, scoreColor } from "./ScoreBar";
import ConfidenceSection from "./ConfidenceSection";
import PageFeedbackSection from "./PageFeedbackSection";
import { FOCUS_OPTIONS, RUBRIC_LABELS, GENRE_COLORS } from "./constants";

interface Props {
  result: EvaluationResult;
  onReset: () => void;
  onReEvaluate?: (focus: EvaluationFocus) => void;
  isReEvaluating?: boolean;
}

function OverallCircle({ score }: { score: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = (score - 1) / 4;
  const offset = circumference * (1 - pct);

  const color =
    score >= 4.5
      ? "#10b981"
      : score >= 3.5
      ? "#14b8a6"
      : score >= 2.5
      ? "#f59e0b"
      : score >= 1.5
      ? "#f97316"
      : "#ef4444";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-bold text-slate-800">{score.toFixed(1)}</span>
        <span className="text-xs text-slate-500">/ 5</span>
      </div>
    </div>
  );
}

export default function EvaluationReport({
  result,
  onReset,
  onReEvaluate,
  isReEvaluating,
}: Props) {
  const [selectedFocus, setSelectedFocus] = useState<EvaluationFocus>(
    result.focus ?? "balanced"
  );
  const gradeColors: Record<string, string> = {
    Exceptional: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Strong: "bg-teal-100 text-teal-800 border-teal-300",
    Developing: "bg-amber-100 text-amber-800 border-amber-300",
    Emerging: "bg-orange-100 text-orange-800 border-orange-300",
  };
  const gradeClass =
    gradeColors[result.overallGrade] ?? "bg-slate-100 text-slate-800 border-slate-300";

  const uncertainties = result.uncertainties ?? [];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <OverallCircle score={result.overallScore} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {result.bookTitle}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${gradeClass}`}
            >
              {result.overallGrade}
            </span>
            {result.genre && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${GENRE_COLORS[result.genre] ?? GENRE_COLORS["Other"]}`}
              >
                {result.genre}
              </span>
            )}
            {result.focus && result.focus !== "balanced" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-100 text-indigo-800 border-indigo-300 capitalize">
                Focus: {result.focus}
              </span>
            )}
            {result.cached && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-sky-100 text-sky-800 border-sky-300">
                Cached
              </span>
            )}
          </div>
          <a
            href={result.bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-1 inline-block"
          >
            Open book
          </a>
        </div>
        <div className="flex flex-col gap-2 self-start flex-shrink-0">
          {onReEvaluate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Re-evaluate with focus
              </label>
              <div className="flex flex-wrap gap-1">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedFocus(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedFocus === opt.value
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onReEvaluate(selectedFocus)}
                disabled={isReEvaluating}
                className="px-4 py-2 rounded-lg text-sm font-medium
                  bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReEvaluating ? "Re-evaluating…" : "Re-evaluate"}
              </button>
            </div>
          )}
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium
              bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            New book
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
        <h3 className="font-semibold text-indigo-800 mb-2">Teacher Summary</h3>
        <p className="text-slate-700 leading-relaxed">{result.teacherSummary}</p>
      </div>

      <ConfidenceSection
        confidence={result.confidence}
        confidenceNote={result.confidenceNote}
        uncertainties={uncertainties}
      />

      {result.pages?.length > 0 && (
        <PageFeedbackSection
          pages={result.pages}
          orientation={result.orientation ?? "portrait"}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Evaluation Rubric</h3>
        <div className="flex flex-col gap-5">
          {Object.entries(result.rubric).map(([key, dim]) => {
            const meta = RUBRIC_LABELS[key] ?? { label: key, hint: "" };
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700" title={meta.hint}>
                    {meta.label}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(dim.score).replace("bg-", "bg-").replace("-500", "-100")} text-slate-700`}
                  >
                    {scoreLabel(dim.score)}
                  </span>
                </div>
                <ScoreBar score={dim.score} />
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {dim.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <h3 className="font-semibold text-emerald-800 mb-3">Highlights</h3>
          <ul className="flex flex-col gap-2 list-disc list-inside text-sm text-slate-700">
            {result.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3">Suggestions</h3>
          <ul className="flex flex-col gap-2 list-disc list-inside text-sm text-slate-700">
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
