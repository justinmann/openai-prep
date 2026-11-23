import React from 'react';
import { GITHUB_URL, SITE_NAME } from '../../shared/seo';
import { Link } from '../router';
import { SignInButton, useSignedIn } from './SignIn';

// Header and footer for the browsing pages (landing, list, company pages).

export function SiteHeader(): React.ReactElement {
  const signedIn = useSignedIn();
  return (
    <header className="site-header">
      <Link to="" params={{}} className="brand" data-id="nav-home">
        <img src="/icon.svg" alt="" width={28} height={28} />
        <span>{SITE_NAME}</span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link to="questions" params={{}} data-id="nav-questions">
          Questions
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          data-id="nav-github"
        >
          GitHub
        </a>
        {!signedIn && <SignInButton id="header-sign-in" variant="secondary" />}
      </nav>
    </header>
  );
}

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="site-footer muted small">
      <p>
        Questions are written in our own words from topics candidates have
        reported publicly; each question links its sources. Company weighting is
        our reading of those reports. Not affiliated with any company listed.
      </p>
      <p>
        Open source on{' '}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          data-id="footer-github"
        >
          GitHub
        </a>
        . Code runs in your browser; drafts, progress and grades are saved to
        your account.
      </p>
    </footer>
  );
}
