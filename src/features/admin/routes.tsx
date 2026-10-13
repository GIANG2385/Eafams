import { Navigate, Route } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Schools } from './Schools';
import { Structure } from './Structure';
import { Students } from './Students';
import { Import } from './Import';
import { EaLifecycle } from './EaLifecycle';
import { FeeConfig } from './FeeConfig';
import { FeeBatch as FeeBatchPage } from './FeeBatch';

export const adminRoutes = (
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<Navigate to="students" replace />} />
    <Route path="schools" element={<Schools />} />
    <Route path="structure" element={<Structure />} />
    <Route path="students" element={<Students />} />
    <Route path="import" element={<Import />} />
    <Route path="ea" element={<EaLifecycle />} />
    <Route path="fees" element={<FeeConfig />} />
    <Route path="batches" element={<FeeBatchPage />} />
  </Route>
);
