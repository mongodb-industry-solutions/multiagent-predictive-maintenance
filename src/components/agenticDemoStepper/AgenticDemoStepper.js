"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@via-ds/icons";
import { Step, Stepper } from "@via-ds/components";
import NextStepButton from "@/components/nextStepButton/NextStepButton";
import { fetchAlerts } from "@/lib/api/alerts";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { fetchWorkOrders } from "@/lib/api/workOrders";
import {
  AGENTIC_PROGRESS_EVENT,
  AGENTIC_PROGRESS_KEY,
} from "@/lib/agenticProgress";

const DEMO_ROUTES = [
  "/agentic-ai/failure-prediction",
  "/agentic-ai/workorder-generation",
  "/agentic-ai/workorder-scheduler",
  "/agentic-ai/agent-sandbox",
];
const LAST_DEMO_ROUTE_KEY = "leafy-agentic-last-route";

const STEPS = [
  {
    label: "Detection",
    href: "/agentic-ai/failure-prediction#detection",
    requiredProgress: 0,
  },
  {
    label: "Root cause analysis",
    href: "/agentic-ai/failure-prediction#root-cause-analysis",
    requiredProgress: 1,
    blockedReason: "Generate an alert to unlock root cause analysis.",
  },
  {
    label: "Work order generation",
    href: "/agentic-ai/workorder-generation",
    requiredProgress: 2,
    blockedReason:
      "Complete root cause analysis to create a recent incident report.",
  },
  {
    label: "Scheduler",
    href: "/agentic-ai/workorder-scheduler",
    requiredProgress: 3,
    blockedReason: "Generate a recent work order before scheduling.",
  },
];

export function isAgenticDemoPath(pathname) {
  return DEMO_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function AgenticDemoStepper() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionProgress, setSessionProgress] = useState(0);
  const [availableProgress, setAvailableProgress] = useState(0);
  const [lastDemoRoute, setLastDemoRoute] = useState(null);
  const [blockedMessage, setBlockedMessage] = useState(null);
  const blockedMessageTimeout = useRef(null);

  useEffect(() => {
    const readProgress = () => {
      setSessionProgress(
        Number(window.sessionStorage.getItem(AGENTIC_PROGRESS_KEY) || 0),
      );
    };
    const handleProgress = (event) => {
      const nextProgress = event.detail?.progress || 0;
      setSessionProgress(nextProgress);
      setAvailableProgress((current) => Math.max(current, nextProgress));
    };

    readProgress();
    setLastDemoRoute(window.sessionStorage.getItem(LAST_DEMO_ROUTE_KEY));
    Promise.all([fetchAlerts(), fetchIncidentReports(), fetchWorkOrders()])
      .then(([alerts, incidentReports, workOrders]) => {
        const dataProgress =
          workOrders.length > 0
            ? 3
            : incidentReports.length > 0
              ? 2
              : alerts.length > 0
                ? 1
                : 0;
        setAvailableProgress(dataProgress);
      })
      .catch(() => setAvailableProgress(0));
    window.addEventListener(AGENTIC_PROGRESS_EVENT, handleProgress);
    return () => {
      window.removeEventListener(AGENTIC_PROGRESS_EVENT, handleProgress);
      if (blockedMessageTimeout.current) {
        window.clearTimeout(blockedMessageTimeout.current);
      }
    };
  }, []);

  const progress = sessionProgress;
  const navigationProgress = Math.max(sessionProgress, availableProgress);

  const showBlockedMessage = (message, anchor) => {
    const root = anchor?.closest(".agentic-demo-stepper");
    const step = anchor?.closest("li") || anchor;
    let left = "50%";

    if (root && step) {
      const rootRect = root.getBoundingClientRect();
      const stepRect = step.getBoundingClientRect();
      const relativeCenter = stepRect.left + stepRect.width / 2 - rootRect.left;
      const edgePadding = Math.min(140, rootRect.width / 2);
      left = Math.min(
        Math.max(relativeCenter, edgePadding),
        rootRect.width - edgePadding,
      );
    }

    setBlockedMessage({ text: message, left });
    if (blockedMessageTimeout.current) {
      window.clearTimeout(blockedMessageTimeout.current);
    }
    blockedMessageTimeout.current = window.setTimeout(
      () => setBlockedMessage(null),
      3000,
    );
  };

  const handleStepperClick = (event) => {
    const stepElement = event.target.closest("li");
    if (!stepElement || !event.currentTarget.contains(stepElement)) return;

    const stepIndex = Array.from(stepElement.parentElement.children).indexOf(
      stepElement,
    );
    const step = STEPS[stepIndex];
    if (!step) return;

    if (navigationProgress >= step.requiredProgress) {
      router.push(step.href);
    } else {
      showBlockedMessage(step.blockedReason, stepElement);
    }
  };

  if (!isAgenticDemoPath(pathname)) return null;

  if (pathname.startsWith("/agentic-ai/agent-sandbox")) {
    const fallbackRoute =
      navigationProgress >= 3
        ? "/agentic-ai/workorder-scheduler"
        : navigationProgress >= 2
          ? "/agentic-ai/workorder-generation"
          : "/agentic-ai/failure-prediction";

    return (
      <div className="shrink-0 px-4 py-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#112733]">
          Predictive Maintenance
        </h1>
        <Link
          href={lastDemoRoute || fallbackRoute}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
        >
          <Icon glyph="ArrowLeft" size={16} />
          <span>Back to demo</span>
        </Link>
      </div>
    );
  }

  const nextAction =
    pathname.startsWith("/agentic-ai/failure-prediction") && progress >= 2
      ? {
          href: "/agentic-ai/workorder-generation",
          label: "Continue to work orders",
        }
      : pathname.startsWith("/agentic-ai/workorder-generation") && progress >= 3
        ? {
            href: "/agentic-ai/workorder-scheduler",
            label: "Continue to scheduler",
          }
        : null;

  return (
    <div className="relative shrink-0">
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(36rem,56rem)_minmax(0,1fr)] items-center gap-6 px-4 py-3">
        <div className="min-w-0 justify-self-start">
          <h1 className="text-2xl font-semibold tracking-tight text-[#112733]">
            Predictive Maintenance
          </h1>
          <Link
            href="/agentic-ai"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            <span>Back to overview</span>
          </Link>
        </div>

        <div
          className="agentic-demo-stepper relative min-w-0 overflow-x-auto"
          onClickCapture={handleStepperClick}
        >
          <Stepper
            currentStep={Math.min(progress, STEPS.length)}
            maxDisplaySteps={STEPS.length}
            aria-label="Agentic demo steps"
            className="min-w-[500px] [&>li]:cursor-pointer"
          >
            {STEPS.map((step, index) => (
              <Step key={String(index)} textValue={step.label}>
                {step.label}
              </Step>
            ))}
          </Stepper>
          {blockedMessage && (
            <div
              role="status"
              aria-live="polite"
              style={{ left: blockedMessage.left }}
              className="absolute top-full z-30 mt-1 max-w-[300px] -translate-x-1/2 rounded-md bg-[#112733] px-3 py-2 text-center text-sm text-white"
            >
              {blockedMessage.text}
            </div>
          )}
        </div>

        <div
          id="agentic-demo-toolbar"
          className="flex w-full items-center justify-end"
        />
      </div>

      {nextAction && (
        <NextStepButton href={nextAction.href} label={nextAction.label} />
      )}
    </div>
  );
}
