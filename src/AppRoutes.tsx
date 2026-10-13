import { Route, Routes } from 'react-router-dom';
import { DemoControls } from './components/DemoControls';
import { ResetDemoButton } from './components/ResetDemoButton';
import { adminRoutes } from './features/admin/routes';
import { eserviceRoutes } from './features/eservice/routes';
import { Landing } from './features/landing/Landing';
import { SignInPage } from './features/auth/SignInPage';

export function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignInPage />} />
        {eserviceRoutes}
        {adminRoutes}
        <Route path="*" element={<p className="p-4">Page not found.</p>} />
      </Routes>
      <ResetDemoButton />
      <DemoControls />
    </div>
  );
}
