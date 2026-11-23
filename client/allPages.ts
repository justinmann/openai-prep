import { lazyPage } from 'ugly-app/client';
import type { PageMap } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';

export const allPageModules = {
  '': () => import('./pages/HomePage'),
  'questions': () => import('./pages/QuestionsPage'),
  'companies/:company': () => import('./pages/CompanyPage'),
  'coding/:id': () => import('./pages/CodingPage'),
  'design/:id': () => import('./pages/DesignPage'),
} as const;

export const allPages = {
  ['']: lazyPage(allPageModules['']),
  ['questions']: lazyPage(allPageModules.questions),
  ['companies/:company']: lazyPage(allPageModules['companies/:company']),
  ['coding/:id']: lazyPage(allPageModules['coding/:id']),
  ['design/:id']: lazyPage(allPageModules['design/:id']),
} satisfies PageMap<AppPages>;
