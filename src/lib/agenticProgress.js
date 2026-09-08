export const AGENTIC_PROGRESS_EVENT = "leafy-agentic-progress";
export const AGENTIC_PROGRESS_KEY = "leafy-agentic-progress";

const STEP_ORDER = {
  detection: 1,
  "root-cause": 2,
  "work-order": 3,
  scheduler: 4,
};

export function markAgenticProgress(step) {
  if (typeof window === "undefined" || !STEP_ORDER[step]) return;

  const current = Number(
    window.sessionStorage.getItem(AGENTIC_PROGRESS_KEY) || 0,
  );
  const progress = Math.max(current, STEP_ORDER[step]);
  window.sessionStorage.setItem(AGENTIC_PROGRESS_KEY, String(progress));
  window.dispatchEvent(
    new CustomEvent(AGENTIC_PROGRESS_EVENT, { detail: { progress } }),
  );
}

export function resetAgenticProgress() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(AGENTIC_PROGRESS_KEY);
  window.dispatchEvent(
    new CustomEvent(AGENTIC_PROGRESS_EVENT, { detail: { progress: 0 } }),
  );
}
