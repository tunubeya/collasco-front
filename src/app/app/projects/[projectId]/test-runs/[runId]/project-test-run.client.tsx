"use client";

import { useState } from "react";

import type { QaTestRunDetail } from "@/lib/api/qa";
import { TestRunPanel } from "@/app/app/projects/[projectId]/features/[featureId]/feature-qa.client";

type ProjectTestRunClientProps = {
  token: string;
  run: QaTestRunDetail;
};

export function ProjectTestRunClient({ token, run: initialRun }: ProjectTestRunClientProps) {
  const [run, setRun] = useState(initialRun);

  return (
    <div className="space-y-6">
      <TestRunPanel token={token} run={run} onRunUpdated={setRun} />
    </div>
  );
}
