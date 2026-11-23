import React from 'react';

/** schema.org structured data, rendered into the server HTML. */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | null;
}): React.ReactElement | null {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
