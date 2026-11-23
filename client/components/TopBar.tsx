import React, { useEffect, useState } from 'react';
import { Button } from 'ugly-app/client';
import { Link } from '../router';

/** Interview-style stopwatch; counts up from when the page opened. */
function Timer(): React.ReactElement {
  // 0 until mounted: the server-rendered HTML must not depend on the clock.
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setStart(Date.now());
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(t);
    };
  }, []);
  const s = Math.floor((now - start) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <div className={`timer ${s >= 45 * 60 ? 'timer-over' : ''}`}>
      <span className="mono">
        {mm}:{ss}
      </span>
      <Button
        variant="ghost"
        size="sm"
        data-id="timer-reset"
        aria-label="Reset timer"
        onClick={() => {
          setStart(Date.now());
          setNow(Date.now());
        }}
      >
        ↺
      </Button>
    </div>
  );
}

export function TopBar({
  title,
  heading = false,
  children,
}: {
  title: string;
  /** Render the title as the page's h1 (server-rendered question pages). */
  heading?: boolean;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="topbar">
      <Link to="questions" params={{}} className="back" data-id="nav-questions">
        ← All questions
      </Link>
      {heading ? (
        <h1 className="topbar-title">{title}</h1>
      ) : (
        <div className="topbar-title">{title}</div>
      )}
      <div className="topbar-actions">
        <Timer />
        {children}
      </div>
    </div>
  );
}
