import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

interface IdleOptions {
  /** Total inactivity before `onIdle` fires (the kiosk reset). */
  idleMs: number;
  /** When to start showing the "still there?" prompt, before `idleMs`. */
  warnMs: number;
  onIdle: () => void;
}

/**
 * Tracks touch/pointer/keyboard activity. After `warnMs` of inactivity it reports
 * `warning` with the seconds left; after `idleMs` it calls `onIdle` once.
 */
export function useIdle({ idleMs, warnMs, onIdle }: IdleOptions) {
  const lastActivity = useRef(Date.now());
  const warningRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(idleMs / 1000));

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
      if (warningRef.current) {
        warningRef.current = false;
        setWarning(false);
      }
    };
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, bump, { passive: true, capture: true });

    const tick = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= idleMs) {
        warningRef.current = false;
        setWarning(false);
        lastActivity.current = Date.now();
        onIdleRef.current();
        return;
      }
      const shouldWarn = idle >= warnMs;
      if (shouldWarn !== warningRef.current) {
        warningRef.current = shouldWarn;
        setWarning(shouldWarn);
      }
      if (shouldWarn) setSecondsLeft(Math.max(1, Math.ceil((idleMs - idle) / 1000)));
    }, 500);

    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, bump, { capture: true });
      window.clearInterval(tick);
    };
  }, [idleMs, warnMs]);

  return { warning, secondsLeft, keepAlive: () => (lastActivity.current = Date.now()) };
}
