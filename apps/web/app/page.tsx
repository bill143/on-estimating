import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-gray-900 text-white">
      <div className="text-center space-y-8 px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">
            ON <span className="text-brand-400">Estimating</span>
          </h1>
          <p className="text-xl text-brand-200">
            O&apos;Neill Contractors — Enterprise Preconstruction Platform
          </p>
        </div>

        <p className="max-w-2xl mx-auto text-lg text-gray-300">
          Bid smarter. Win more. From lead capture to final estimate — manage your
          entire preconstruction pipeline with AI-powered tools built for commercial
          construction.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-colors shadow-lg shadow-brand-600/25"
          >
            Enter Platform
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-400">Pipeline</div>
            <div className="text-sm text-gray-400 mt-1">Bid tracking & Kanban</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-400">Takeoff</div>
            <div className="text-sm text-gray-400 mt-1">AI-powered quantities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-400">Estimate</div>
            <div className="text-sm text-gray-400 mt-1">Cost rollup engine</div>
          </div>
        </div>
      </div>
    </div>
  );
}
