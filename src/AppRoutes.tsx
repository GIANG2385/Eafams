import { Route, Routes } from 'react-router-dom';
import { DemoControls } from './components/DemoControls';
import { PrototypeBanner } from './components/Shell';
import { adminRoutes } from './features/admin/routes';
import { eserviceRoutes } from './features/eservice/routes';
import { Landing } from './features/landing/Landing';

export function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PrototypeBanner />
      <Routes>
        <Route path="/" element={<Landing />} />
        {eserviceRoutes}
        {adminRoutes}
        <Route path="*" element={<p className="p-4">Page not found.</p>} />
      </Routes>
      <DemoControls />
    </div>
  );
}
