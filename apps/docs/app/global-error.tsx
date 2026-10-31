'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050505] text-[#EDEDED] flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-[#0066FF] text-white rounded-md text-sm font-medium hover:bg-[#0052CC] transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}

