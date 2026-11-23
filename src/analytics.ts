// Anonymous funnel counters: only the event name is sent, no personal data, no cookies.
// Each event is counted at most once per browser tab session.
export type TrackEvent =
  | 'visit'
  | 'estimate_view'
  | 'estimate_edit'
  | 'layout_pick'
  | 'finish_pick'
  | 'pdf'
  | 'share'
  | 'save'
  | 'book_click';

const sentThisPage = new Set<TrackEvent>();

export function track(e: TrackEvent): void {
  if (sentThisPage.has(e)) return;
  sentThisPage.add(e);
  try {
    const key = `rh_t_${e}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // private mode: the in-memory set above still prevents repeats on this page
  }
  try {
    const body = JSON.stringify({ e });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    }
  } catch {
    // analytics must never break the page
  }
}
