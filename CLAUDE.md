# Edufarm prototype – working notes

- Purpose: clickable prototype, mock data only, no backend. Two portals in one SPA: `/admin/*`, `/eservice/*`.
- Stack: Vite, React 18, TypeScript strict, Tailwind 3, React Router 6, TanStack Query 5, Vitest + RTL.
- Layers: `src/domain` (pure rules, no React) → `src/services` (async mock API) → `src/features` (UI). UI never touches `domain` state directly.
- Money is integer cents (SGD). "Today" comes from `db.settings.today`, never `Date.now()`.
- Every integration is mock/sandbox and must carry its badge in the UI.
- Commands: `npm run dev`, `npm test`, `npm run build`.
- This repo is PUBLIC: never add client requirement documents, meeting notes, team names or real branding. Seed data must stay fictional.
