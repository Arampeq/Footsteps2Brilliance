"use client";

export default function LoadingState() {
  return (
    <div className="w-full max-w-md mx-auto mt-12 flex flex-col items-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-500 mt-1">
          This may take a little while.
        </p>
      </div>
    </div>
  );
}
