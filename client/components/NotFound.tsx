import React from 'react';
import { Link } from '../router';

export function NotFound({ what }: { what: string }): React.ReactElement {
  return (
    <div className="notfound" data-id="not-found">
      <h1>Not found</h1>
      <p>
        There is no {what}.{' '}
        <Link to="questions" params={{}}>
          See all questions
        </Link>
      </p>
    </div>
  );
}
