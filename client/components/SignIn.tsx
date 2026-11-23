import React from 'react';
import {
  Button,
  isStandaloneDisplay,
  startUglyBotLogin,
  startUglyBotRedirectLogin,
  useAppOptional,
} from 'ugly-app/client';

// Questions are public; writing code, saving progress and AI grading need an
// account. Pages render signed-out first (the server-rendered document is the
// same for every visitor) and switch once the session resolves.

/** True once the visitor's session has resolved to a signed-in user. */
export function useSignedIn(): boolean {
  return useAppOptional() !== null;
}

/** Opens the ugly.bot sign-in, returning to the current page afterwards. */
export function signIn(): void {
  const here = window.location.pathname + window.location.search;
  if (isStandaloneDisplay()) startUglyBotRedirectLogin({ returnTo: here });
  else startUglyBotLogin({ redirectTo: here });
}

export function SignInButton({
  id = 'sign-in',
  label = 'Sign in',
  variant = 'primary',
}: {
  id?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}): React.ReactElement {
  return (
    <Button data-id={id} variant={variant} onClick={signIn}>
      {label}
    </Button>
  );
}

/** Stands in for the editor or the answer box when signed out. */
export function SignInGate({
  title,
  body,
}: {
  title: string;
  body: string;
}): React.ReactElement {
  return (
    <div className="signin-gate" data-id="signin-gate">
      <h3>{title}</h3>
      <p className="muted">{body}</p>
      <SignInButton id="gate-sign-in" label="Sign in to start" />
      <p className="muted small">
        Free. Your drafts and progress follow you between devices.
      </p>
    </div>
  );
}
