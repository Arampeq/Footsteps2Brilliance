"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import LoadingState from "@/components/LoadingState";
import EvaluationReport from "@/components/EvaluationReport";
import { EvaluationState, EvaluationFocus } from "@/types/evaluation";
import { evaluateBook } from "@/lib/api";

export default function Home() {
  const [state, setState] = useState<EvaluationState>({ status: "idle" });

  async function handleSubmit(url: string, force = false, focus: EvaluationFocus = "balanced") {
    setState({ status: "processing" });
    try {
      const result = await evaluateBook(url, force, focus);
      setState({ status: "success", result });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setState({ status: "error", message });
    }
  }

  function handleReset() {
    setState({ status: "idle" });
  }

  const isLoading = state.status === "processing";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              F2B
            </div>
            <span className="font-semibold text-slate-800 text-sm sm:text-base">
              AI Book Evaluator
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            Footsteps2Brilliance · Create-A-Book
          </span>
        </div>
      </header>

 
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {(state.status === "idle" || state.status === "error") && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                Evaluate a Student{" "}
                <span className="text-indigo-600">Picture Book</span>
              </h1>
              <p className="mt-3 text-slate-500 text-base sm:text-lg leading-relaxed">
                Paste a Create-A-Book share link below. The app builds the book
                PDF and evaluates it with Claude for a teacher-ready literacy report.
              </p>
            </div>

            <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />

     
            {state.status === "error" && (
              <div className="w-full max-w-2xl bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 text-sm">
                    Evaluation failed
                  </p>
                  <p className="text-red-700 text-sm mt-0.5">{state.message}</p>
                </div>
              </div>
            )}

         
            <div className="w-full max-w-2xl mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                How it works
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    step: "1",
                    title: "Paste URL",
                    desc: "Any myf2b.com/cab2s/ link",
                  },
                  {
                    step: "2",
                    title: "Build PDF",
                    desc: "We load the print page and build the PDF link",
                  },
                  {
                    step: "3",
                    title: "AI evaluates",
                    desc: "Claude reads the book PDF",
                  },
                ].map(({ step, title, desc }) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">
                        {title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

 
        {isLoading && (
          <LoadingState />
        )}


        {state.status === "success" && (
          <EvaluationReport
            result={state.result}
            onReset={handleReset}
            onReEvaluate={(focus) =>
              handleSubmit(state.result.bookUrl, true, focus)
            }
            isReEvaluating={isLoading}
          />
        )}
      </main>

    
    </div>
  );
}
