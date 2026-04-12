const SkeletonBase = ({ className }: { className: string }) => (
  <div
    className={`${className} bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%] animate-pulse`}
  />
);

export function FinancialScoreSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <SkeletonBase className="h-8 w-32 rounded" />
      <div className="space-y-3">
        <SkeletonBase className="h-24 w-full rounded" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonBase className="h-12 rounded" />
          <SkeletonBase className="h-12 rounded" />
        </div>
      </div>
    </div>
  );
}

export function MonthlySummarySkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <SkeletonBase className="h-6 w-24 rounded" />
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-full rounded" />
        <SkeletonBase className="h-4 w-5/6 rounded" />
        <SkeletonBase className="h-4 w-4/5 rounded" />
      </div>
    </div>
  );
}

export function AccountBalanceSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <SkeletonBase className="h-6 w-28 rounded" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2 pb-2 border-b border-neutral-100 last:border-0">
          <SkeletonBase className="h-4 w-24 rounded" />
          <SkeletonBase className="h-5 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ExpenseBreakdownSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <SkeletonBase className="h-6 w-32 rounded" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonBase className="h-3 flex-1 rounded" />
            <SkeletonBase className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentTransactionsSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <SkeletonBase className="h-6 w-32 rounded" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between pb-2 border-b border-neutral-100 last:border-0">
            <div className="flex-1">
              <SkeletonBase className="h-4 w-24 rounded mb-1" />
              <SkeletonBase className="h-3 w-20 rounded" />
            </div>
            <SkeletonBase className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DebtsOverviewSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <SkeletonBase className="h-6 w-24 rounded" />
      <SkeletonBase className="h-10 w-full rounded" />
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-full rounded" />
        <SkeletonBase className="h-4 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function TaxObligationsSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <SkeletonBase className="h-6 w-32 rounded" />
      {[1, 2].map((i) => (
        <div key={i} className="p-3 border border-neutral-100 rounded space-y-2">
          <SkeletonBase className="h-4 w-24 rounded" />
          <SkeletonBase className="h-3 w-32 rounded" />
          <SkeletonBase className="h-5 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CoachInsightsSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <SkeletonBase className="h-6 w-28 rounded" />
      {[1, 2].map((i) => (
        <div key={i} className="p-3 bg-blue-50 border border-blue-100 rounded space-y-2">
          <SkeletonBase className="h-4 w-full rounded" />
          <SkeletonBase className="h-4 w-5/6 rounded" />
        </div>
      ))}
    </div>
  );
}

export function InstallmentsSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <SkeletonBase className="h-6 w-24 rounded" />
      <SkeletonBase className="h-10 w-full rounded" />
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-full rounded" />
        <SkeletonBase className="h-3 w-4/5 rounded" />
      </div>
    </div>
  );
}
