import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-bg px-4 text-center text-fg">
      <p className="eyebrow tabular-nums">404</p>
      <h1 className="mt-3 font-display text-4xl font-normal tracking-tight text-fg">Page not found</h1>
      <p className="mt-3 text-[15px] text-fg-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Return home
      </Link>
    </div>
  );
}
