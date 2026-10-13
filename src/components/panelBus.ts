import { useEffect, useRef } from 'react';

const EVENT = 'edufarm:panel-open';

/** Floating panels share the bottom corners; opening one closes the others so they never overlap on a phone. */
export function announcePanelOpen(name: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: name }));
}

export function useCloseWhenOtherPanelOpens(self: string, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== self) closeRef.current();
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, [self]);
}
