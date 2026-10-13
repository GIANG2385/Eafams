import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { can } from '../../domain/permissions';
import { listStructure, saveClass, saveLevel, setStatus } from '../../services/admin';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

export function Structure() {
  const { actor } = useSession();
  const q = useQuery({ queryKey: ['structure', actor], queryFn: () => listStructure(actor) });
  const [schoolId, setSchoolId] = useState('');
  const [levelName, setLevelName] = useState('');
  const [levelId, setLevelId] = useState('');
  const [className, setClassName] = useState('');
  const [year, setYear] = useState('2026');
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const run = async (fn: () => Promise<unknown>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await fn();
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Levels &amp; classes</h2>
      <PbiChip code="PB-02" check="schools manage from level down" />
      <p className="text-sm text-slate-600">Level and cohort are the same thing here; class is a separate dimension.</p>
      <QueryState query={q} isEmpty={(d) => d.schools.length === 0} emptyText="No schools in scope.">
        {({ schools, levels, classes }) => {
          const sid = actor.kind === 'SCHOOL' ? actor.schoolId : schoolId || schools[0]?.id;
          const levelOptions = levels.filter((l) => l.schoolId === sid);
          return (
            <>
              {schools.map((s) => (
                <Card key={s.id} title={s.name}>
                  <ul className="space-y-2">
                    {levels.filter((l) => l.schoolId === s.id).map((l) => (
                      <li key={l.id}>
                        <div className="flex items-center gap-2">
                          <strong>{l.name}</strong>
                          <Badge tone={l.status === 'ACTIVE' ? 'green' : 'slate'}>{l.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                          {can(actor, 'DEACTIVATE', 'LEVEL', s.id) && (
                            <Button variant="secondary" onClick={() => void run(() => setStatus(actor, 'LEVEL', l.id, l.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}>
                              {l.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </div>
                        <ul className="ml-4 mt-1 space-y-1">
                          {classes.filter((c) => c.levelId === l.id).map((c) => (
                            <li key={c.id} className="flex items-center gap-2 text-sm">
                              <span>{c.name}</span>
                              <span className="text-slate-500">({c.academicYear})</span>
                              <Badge tone={c.status === 'ACTIVE' ? 'green' : 'slate'}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                              {can(actor, 'DEACTIVATE', 'CLASS', s.id) && (
                                <Button variant="secondary" onClick={() => void run(() => setStatus(actor, 'CLASS', c.id, c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}>
                                  {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
              <Card title="Add level">
                <div className="grid gap-3 sm:grid-cols-3">
                  {actor.kind === 'HQ' && (
                    <div>
                      <label htmlFor="level-school" className="block text-sm font-medium">School</label>
                      <select id="level-school" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={sid} onChange={(e) => setSchoolId(e.target.value)}>
                        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <Field id="level-name" label="Level name" value={levelName} onChange={(e) => setLevelName(e.target.value)} />
                  <div className="flex items-end">
                    <Button onClick={() => void run(async () => { await saveLevel(actor, { schoolId: sid!, name: levelName }); setLevelName(''); })}>Add level</Button>
                  </div>
                </div>
              </Card>
              <Card title="Add class">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label htmlFor="class-level" className="block text-sm font-medium">Level</label>
                    <select id="class-level" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={levelId || levelOptions[0]?.id || ''} onChange={(e) => setLevelId(e.target.value)}>
                      {levelOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <Field id="class-name" label="Class name" value={className} onChange={(e) => setClassName(e.target.value)} />
                  <Field id="class-year" label="Academic year" value={year} onChange={(e) => setYear(e.target.value)} />
                  <div className="flex items-end">
                    <Button onClick={() => void run(async () => { await saveClass(actor, { levelId: levelId || levelOptions[0]?.id || '', name: className, academicYear: year }); setClassName(''); })}>Add class</Button>
                  </div>
                </div>
              </Card>
              {error && <p role="alert" className="text-rose-700">{error}</p>}
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
