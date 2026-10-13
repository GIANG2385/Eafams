import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ServiceError } from '../services/core';
import { Button } from './ui';

export function errorMessage(e: unknown): string {
  if (e instanceof ServiceError) return e.message;
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function QueryState<T>({
  query,
  isEmpty,
  emptyText = 'Nothing to show.',
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <p role="status" className="text-slate-600">Loading…</p>;
  if (query.isError) {
    return (
      <div role="alert" className="rounded border border-rose-300 bg-rose-50 p-3">
        <p className="text-rose-900">{errorMessage(query.error)}</p>
        <Button variant="secondary" className="mt-2" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (isEmpty?.(query.data)) return <p className="text-slate-600">{emptyText}</p>;
  return <>{children(query.data)}</>;
}
