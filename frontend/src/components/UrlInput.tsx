"use client";

import { useState } from "react";


interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function UrlInput({ onSubmit, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function validate(value: string): string {
    if (!value.trim()) return "Please enter a book URL.";
    try {
      const parsed = new URL(value.trim());
      if (!parsed.hostname.includes("myf2b.com")) {
        return "URL must be from myf2b.com (e.g. https://myf2b.com/cab2s/<id>).";
      }
      if (!parsed.pathname.startsWith("/cab2s/")) {
        return "URL must be a Create-A-Book link: https://myf2b.com/cab2s/<id>.";
      }
    } catch {
      return "Please enter a valid URL.";
    }
    return "";
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const err = validate(url);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    onSubmit(url.trim());
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="book-url"
          className="text-sm font-semibold text-slate-600 tracking-wide uppercase"
        >
          Book URL
        </label>
        <div className="flex gap-2">
          <input
            id="book-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://myf2b.com/cab2s/..."
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-xl border-2 text-base transition-all outline-none
              font-mono text-slate-800 bg-white placeholder-slate-400
              ${error ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-indigo-400"}
              disabled:opacity-50 disabled:cursor-not-allowed`}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
              text-white font-semibold text-base transition-all shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Working…
              </span>
            ) : (
              "Evaluate Book"
            )}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
