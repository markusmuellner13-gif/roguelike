let hideTimer: number | null = null;

export function showToast(message: string, durationMs = 2400): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  if (hideTimer !== null) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, durationMs);
}
