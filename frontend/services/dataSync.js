import { useEffect, useState } from 'react';

/**
 * "Something changed on the server -- go and read it again."
 *
 * A ledger write moves three separate figures: the member's portfolio, the
 * group's corpus, and the ledger list. Rather than have the writing screen
 * reach into three other modules, it bumps a counter here and any mounted
 * screen that cares re-fetches. The screen still asks the backend for the new
 * value; nothing is computed locally from the write.
 *
 * WHY NOT A STATE LIBRARY
 * -----------------------
 * This is a counter and a Set of callbacks. Redux or Zustand would be a
 * framework's worth of ceremony for one integer, and the project has neither.
 *
 * WHY NOT ONLY useFocusEffect
 * ---------------------------
 * Focus already covers the common path -- record a transaction, navigate to
 * the portfolio, see the new total. This covers the case focus misses: a
 * screen mounted and focused while a write happens somewhere else, which would
 * otherwise sit showing a number the server no longer agrees with.
 */

let version = 0;
const listeners = new Set();

/** Call after any successful write that changes server-side financial state. */
export function notifyDataChanged() {
  version += 1;
  listeners.forEach((listener) => {
    try {
      listener(version);
    } catch {
      // One bad subscriber must not stop the others being told.
    }
  });
}

export function getDataVersion() {
  return version;
}

/**
 * Re-render when server data changes. Use the returned value as a dependency
 * of whatever loads the screen:
 *
 *   const dataVersion = useDataVersion();
 *   useEffect(() => { load(); }, [load, dataVersion]);
 */
export function useDataVersion() {
  const [current, setCurrent] = useState(version);

  useEffect(() => {
    const listener = (next) => setCurrent(next);
    listeners.add(listener);
    // A write may have landed between render and subscribe.
    if (version !== current) setCurrent(version);
    return () => listeners.delete(listener);
    // Subscribing once is correct: the listener closes over nothing stale.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return current;
}

export default { notifyDataChanged, getDataVersion, useDataVersion };
