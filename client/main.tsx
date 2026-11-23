import { bootstrapApp } from 'ugly-app/client';
import { requests } from '../shared/api';
import { allPages } from './allPages';
import { renderApp, strings } from './appRoot';
import { prepareInitialPage } from './prepareInitialPage';
import { RouterProvider, setAllPages } from './router';
import { workspaceLoaders } from './workspaces';
import './styles.css';

setAllPages(allPages);
// Browser-only: the editor and whiteboard never reach the server bundle.
workspaceLoaders.coding = () => import('./pages/CodingWorkspace');
workspaceLoaders.design = () => import('./pages/DesignWorkspace');

void prepareInitialPage(new URL(location.href)).then(() => {
  bootstrapApp({ requests, RouterProvider, render: renderApp, strings });
});
