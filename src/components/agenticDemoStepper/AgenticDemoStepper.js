"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@leafygreen-ui/icon";
import { Step, Stepper } from "@leafygreen-ui/stepper";
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
    if (event.target.closest("a, button")) return;

    const stepElement = event.target.closest("li");
    if (!stepElement) return;

    const stepIndex = Array.from(event.currentTarget.children).indexOf(
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
        <Link
          href={lastDemoRoute || fallbackRoute}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00684A] hover:underline"
        >
          <Icon glyph="ArrowLeft" size={16} />
          Back to demo
        </Link>
      </div>
    );
  }

  const currentViewStep = pathname.startsWith("/agentic-ai/workorder-scheduler")
    ? 3
    : pathname.startsWith("/agentic-ai/workorder-generation")
      ? 2
      : progress >= 1
        ? 1
        : 0;

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
    <div className="agentic-demo-stepper relative shrink-0 px-2">
      <div className="flex w-full items-center gap-3 px-4 py-1">
        <Link
          href="/agentic-ai"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
        >
          <Icon glyph="ArrowLeft" size={16} />
          <span className="hidden sm:inline">Back to overview</span>
        </Link>

        <div className="min-w-[520px] flex-1 overflow-x-auto px-2">
          <Stepper
            currentStep={Math.min(progress, STEPS.length)}
            maxDisplayedSteps={STEPS.length}
            onClick={handleStepperClick}
            className="min-w-[500px] [&>li]:cursor-pointer"
          >
            {STEPS.map((step, index) => {
              const enabled = navigationProgress >= step.requiredProgress;
              const current = index === currentViewStep;

              return (
                <Step key={step.label}>
                  {enabled ? (
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-1.5 px-2 text-[13px] leading-4 no-underline transition-colors ${
                        current
                          ? "font-semibold text-[#00684A]"
                          : "font-normal text-[#3D4F58] hover:bg-[#F1F5F3] hover:text-[#00684A]"
                      }`}
                    >
                      {step.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-disabled="true"
                      title={step.blockedReason}
                      onClick={(event) =>
                        showBlockedMessage(
                          step.blockedReason,
                          event.currentTarget,
                        )
                      }
                      className="cursor-not-allowed rounded-md px-2 text-[13px] leading-4 text-[#889397] opacity-70"
                    >
                      {step.label}
                    </button>
                  )}
                </Step>
              );
            })}
          </Stepper>
        </div>

        <Link
          href="/agentic-ai/agent-sandbox"
          onClick={() => {
            window.sessionStorage.setItem(LAST_DEMO_ROUTE_KEY, pathname);
            setLastDemoRoute(pathname);
          }}
          className="flex shrink-0 items-center gap-2 rounded-full border border-[#C1C7C6] px-3 py-1.5 text-[#00684A] shadow-sm transition-colors hover:border-[#00684A]"
        >
          <Icon glyph="Wrench" size={18} className="text-[#00684A]" />
          <span className="hidden text-sm font-medium text-[#00684A] lg:block">
            Agent Sandbox
          </span>
        </Link>
      </div>

      {blockedMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{ left: blockedMessage.left }}
          className="absolute top-full z-30 mt-1 max-w-[300px] -translate-x-1/2 rounded-md bg-[#112733] px-3 py-2 text-center text-xs text-white"
        >
          {blockedMessage.text}
        </div>
      )}

      {nextAction && (
        <NextStepButton href={nextAction.href} label={nextAction.label} />
      )}
    </div>
  );
}
