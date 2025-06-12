"use client";

import WorkorderPlanner from "@/components/workorderPlanner/WorkorderPlanner";

export default function Page() {
  return (
    <main className="flex flex-row items-start justify-center min-h-screen">
      <div className="flex-1 flex justify-center">
        <WorkorderPlanner />
      </div>
      {/* You can add the right-side content here in the future */}
    </main>
  );
}
