import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-[#070709] text-white px-4">
      <h1 className="text-4xl font-bold font-mono text-purple-400 mb-2">404</h1>
      <p className="text-zinc-400 mb-6 text-sm">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
