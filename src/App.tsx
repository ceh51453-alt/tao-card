import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { CopilotPanel } from './components/copilot/CopilotPanel';
import { useCardStore } from './store/cardStore';

const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CardEditorPage = lazy(() => import('./pages/CardEditorPage').then(m => ({ default: m.CardEditorPage })));
const LorebookPage = lazy(() => import('./pages/LorebookPage').then(m => ({ default: m.LorebookPage })));
const RegexLabPage = lazy(() => import('./pages/RegexLabPage').then(m => ({ default: m.RegexLabPage })));
const MVUZODPage = lazy(() => import('./pages/MVUZODPage').then(m => ({ default: m.MVUZODPage })));
const EJSStudioPage = lazy(() => import('./pages/EJSStudioPage').then(m => ({ default: m.EJSStudioPage })));
const WikiPage = lazy(() => import('./pages/WikiPage').then(m => ({ default: m.WikiPage })));

function AppInit() {
  const { createNewProject, loadProject, refreshProjectList } = useCardStore();

  useEffect(() => {
    const init = async () => {
      await refreshProjectList();
      const allProjects = useCardStore.getState().projects;
      if (allProjects.length === 0) {
        await createNewProject('New Character');
      } else {
        await loadProject(allProjects[0].id);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/editor" element={<CardEditorPage />} />
          <Route path="/lorebook" element={<LorebookPage />} />
          <Route path="/regex" element={<RegexLabPage />} />
          <Route path="/mvuzod" element={<MVUZODPage />} />
          <Route path="/ejs-studio" element={<EJSStudioPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Route>
      </Routes>
      <CopilotPanel />
    </BrowserRouter>
  );
}
