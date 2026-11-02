import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-[#F38020]/10 border border-[#F38020]/30 flex items-center justify-center text-[#F38020] font-bold text-lg font-logo mb-4 shadow-[0_0_20px_rgba(243,128,32,0.2)]">
        404
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Documentation Page Not Found</h1>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        The documentation page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/docs"
        className="px-4 py-2 rounded-md bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium text-sm transition-colors shadow-sm"
      >
        Back to Documentation
      </Link>
    </main>
  );
}

