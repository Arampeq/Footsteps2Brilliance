interface Props {
  score: number;
  size?: "sm" | "md";
}

function scoreColor(score: number): string {
  if (score >= 4.5) return "bg-emerald-500";
  if (score >= 3.5) return "bg-teal-500";
  if (score >= 2.5) return "bg-amber-400";
  if (score >= 1.5) return "bg-orange-400";
  return "bg-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 4.5) return "Exceptional";
  if (score >= 3.5) return "Strong";
  if (score >= 2.5) return "Developing";
  if (score >= 1.5) return "Emerging";
  return "Needs Support";
}

export default function ScoreBar({ score, size = "md" }: Props) {
  const pct = ((score - 1) / 4) * 100;
  const color = scoreColor(score);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 rounded-full overflow-hidden ${size === "sm" ? "h-1.5" : "h-2.5"} bg-slate-100`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {size === "md" && (
        <span className="text-xs font-semibold text-slate-500 w-20 text-right">
          {score.toFixed(1)} / 5
        </span>
      )}
    </div>
  );
}

export { scoreLabel, scoreColor };
