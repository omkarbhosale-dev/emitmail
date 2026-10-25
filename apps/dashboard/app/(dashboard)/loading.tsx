export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 rounded-[2px] bg-[#f0f0f0]" />
        <div className="mt-2 h-4 w-72 rounded-[2px] bg-[#f0f0f0]" />
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-[4px] border border-[#f0f0f0] bg-white p-4"
          >
            <div className="h-3 w-24 rounded-[2px] bg-[#f0f0f0]" />
            <div className="mt-4 h-7 w-16 rounded-[2px] bg-[#f0f0f0]" />
            <div className="mt-3 h-3 w-32 rounded-[2px] bg-[#f0f0f0]" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-[4px] border border-[#f0f0f0] bg-white p-4 lg:col-span-2">
          <div className="h-5 w-48 rounded-[2px] bg-[#f0f0f0]" />
          <div className="mt-2 h-3 w-64 rounded-[2px] bg-[#f0f0f0]" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded-[2px] bg-[#f0f0f0]" />
            ))}
          </div>
        </div>

        <div className="h-64 rounded-[4px] border border-[#f0f0f0] bg-white p-4 lg:col-span-1">
          <div className="h-5 w-40 rounded-[2px] bg-[#f0f0f0]" />
          <div className="mt-4 space-y-3">
            <div className="h-16 rounded-[2px] bg-[#f0f0f0]" />
            <div className="h-16 rounded-[2px] bg-[#f0f0f0]" />
          </div>
        </div>
      </div>
    </div>
  );
}
