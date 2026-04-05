function Block({ className = "" }) {
  return <div className={`shimmer rounded-2xl ${className}`} />;
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card p-6">
          <Block className="mb-5 h-5 w-28" />
          <Block className="mb-4 h-36 w-full rounded-[26px]" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Block className="h-20" />
            <Block className="h-20" />
          </div>
        </div>
        <div className="glass-card p-6">
          <Block className="mb-5 h-5 w-28" />
          <Block className="mx-auto mb-5 h-44 w-44 rounded-full" />
          <Block className="mb-3 h-4 w-full" />
          <Block className="mb-3 h-4 w-5/6" />
          <Block className="h-4 w-4/6" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card p-6">
          <Block className="mb-5 h-5 w-36" />
          <Block className="mb-4 h-16 w-full" />
          <Block className="mb-4 h-16 w-full" />
          <Block className="h-16 w-full" />
        </div>
        <div className="glass-card p-6">
          <Block className="mb-5 h-5 w-32" />
          <Block className="mb-3 h-12 w-full" />
          <Block className="mb-3 h-12 w-full" />
          <Block className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export default AnalysisSkeleton;
