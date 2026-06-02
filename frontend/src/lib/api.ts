import { EvaluationResult, EvaluationFocus } from "@/types/evaluation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function evaluateBook(
  url: string,
  force = false,
  focus: EvaluationFocus = "balanced",
): Promise<EvaluationResult> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, force, focus }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message ?? message;
    } catch (parseErr) {
      console.error("Error:", parseErr);
    }
    throw new Error(message);
  }

  return res.json();
}
