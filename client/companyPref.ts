import { useCallback, useEffect, useState } from 'react';
import { findCompany, type Company, type CompanyId } from '../shared/companies';

// The company you are practicing for: a per-browser convenience, so it lives in
// localStorage. It is read after mount, never during render: server-rendered
// pages are the same for every visitor and must hydrate without a mismatch.

const KEY = 'oaiprep:company';
const EVENT = 'oaiprep:company';

function read(): CompanyId | null {
  try {
    return findCompany(localStorage.getItem(KEY) ?? '')?.id ?? null;
  } catch {
    return null;
  }
}

export function setCompanyPref(id: CompanyId | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** The chosen company (null = general bar) and a setter. */
export function useCompanyPref(): [
  Company | null,
  (id: CompanyId | null) => void,
] {
  const [id, setId] = useState<CompanyId | null>(null);
  useEffect(() => {
    setId(read());
    const on = (e: Event) => {
      setId((e as CustomEvent<CompanyId | null>).detail);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
    };
  }, []);
  const set = useCallback((next: CompanyId | null) => {
    setCompanyPref(next);
  }, []);
  return [findCompany(id ?? '') ?? null, set];
}
