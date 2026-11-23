import React, { useEffect, useState } from 'react';
import { Button } from 'ugly-app/client';
import { Link } from '../router';

/** Interview-style stopwatch; counts up from when the page opened. */
function Timer(): React.ReactElement {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
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
  children,
}: {
  title: string;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="topbar">
      <Link to="" params={{}} className="back">
        ← All questions
      </Link>
      <div className="topbar-title">{title}</div>
      <div className="topbar-actions">
        <Timer />
        {children}
      </div>
    </div>
  );
}
