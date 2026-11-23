// Statically imported page components for server rendering. Imported by the
// Worker (server/workers.ts) and SSR tests, never by browser startup. Nothing
// reachable from here may touch `window` during render, and the editor and
// whiteboard must stay unreachable (see client/workspaces.ts).
import type { SsrPageMap } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';
import { initialPages } from './initialPages';
import CodingPage from './pages/CodingPage';
import CompanyPage from './pages/CompanyPage';
import DesignPage from './pages/DesignPage';
import HomePage from './pages/HomePage';
import QuestionsPage from './pages/QuestionsPage';

export const ssrPages: SsrPageMap<AppPages> = {
  '': HomePage,
  'questions': QuestionsPage,
  'companies/:company': CompanyPage,
  'coding/:id': CodingPage,
  'design/:id': DesignPage,
};

Object.assign(initialPages, ssrPages);
