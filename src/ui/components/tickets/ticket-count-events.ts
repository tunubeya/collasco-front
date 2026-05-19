"use client";

const ticketCountsChangedEvent = "qms:ticket-counts-changed";

export function notifyTicketCountsChanged() {
  const dispatch = () => {
    window.dispatchEvent(new CustomEvent(ticketCountsChangedEvent));
  };

  if (typeof window.queueMicrotask === "function") {
    window.queueMicrotask(dispatch);
    return;
  }

  window.setTimeout(dispatch, 0);
}

export function addTicketCountsChangedListener(listener: () => void) {
  window.addEventListener(ticketCountsChangedEvent, listener);
  return () => window.removeEventListener(ticketCountsChangedEvent, listener);
}
