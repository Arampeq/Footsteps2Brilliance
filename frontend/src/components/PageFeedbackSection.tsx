"use client";

import { PageEvaluation } from "@/types/evaluation";

interface Props {
  pages: PageEvaluation[];
  orientation: "portrait" | "landscape";
}

export default function PageFeedbackSection({ pages, orientation }: Props) {
  if (!pages?.length) return null;

  const imgClass =
    orientation === "landscape"
      ? "w-full sm:w-56 lg:w-64"
      : "w-full sm:w-36 lg:w-40";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-slate-800 mb-1">Page-by-page feedback</h3>
      <p className="text-sm text-slate-500 mb-5">
        Each page shown with the student&apos;s text and Claude&apos;s comment.
      </p>

      <ul className="flex flex-col gap-6">
        {pages.map((page) => (
          <li
            key={page.pageNumber}
            className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100"
          >
            <div className={`flex-shrink-0 mx-auto sm:mx-0 ${imgClass}`}>
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                <img
                  src={page.imageUrl}
                  alt={`${page.label} illustration`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-center text-xs font-medium text-slate-500 mt-2">
                {page.label}
              </p>
            </div>

          
            <div className="flex-1 min-w-0 flex flex-col gap-3 justify-center">
            
              {page.pageText && (
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Student&apos;s text
                  </p>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;{page.pageText}&rdquo;
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                  Feedback
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {page.feedback}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
