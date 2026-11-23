import React, { useCallback } from 'react';
import { Button } from 'ugly-app/client';
import { companies, type CompanyId } from '../../shared/companies';
import { useCompanyPref } from '../companyPref';
import { useRouter } from '../router';

// "Practicing for" picker. Changes how coding readiness and design grading are
// weighted; the choice is remembered in this browser.

function PickerPopup({
  current,
  onPick,
  onClose,
}: {
  current: CompanyId | null;
  onPick: (id: CompanyId | null) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className="picker"
      role="dialog"
      aria-label="Choose a company"
      data-id="company-picker"
    >
      <div className="picker-head">
        <h3>Practicing for</h3>
        <Button
          size="sm"
          variant="ghost"
          data-id="picker-close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
      <p className="muted small">
        Scores are weighted the way candidates report each company grades. Pick
        General for an even bar.
      </p>
      <div className="picker-grid">
        <Button
          size="sm"
          variant={current === null ? 'secondary' : 'ghost'}
          data-id="pick-general"
          onClick={() => {
            onPick(null);
          }}
        >
          General
        </Button>
        {companies.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={current === c.id ? 'secondary' : 'ghost'}
            data-id={`pick-${c.id}`}
            onClick={() => {
              onPick(c.id);
            }}
          >
            {c.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CompanyPicker(): React.ReactElement {
  const [company, setCompany] = useCompanyPref();
  const router = useRouter();
  const open = useCallback(() => {
    let popup: { hide: () => void } | null = null;
    popup = router.openPopup(
      <PickerPopup
        current={company?.id ?? null}
        onPick={(id) => {
          setCompany(id);
          popup?.hide();
        }}
        onClose={() => popup?.hide()}
      />,
      { mode: 'transient' },
    );
  }, [router, company, setCompany]);
  return (
    <Button
      size="sm"
      variant="ghost"
      data-id="open-company-picker"
      aria-label="Choose the company you are practicing for"
      onClick={open}
    >
      For: {company?.name ?? 'General'} ▾
    </Button>
  );
}
