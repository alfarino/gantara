# Graph Report - gantara  (2026-08-06)

## Corpus Check
- 105 files · ~40,908 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 420 nodes · 759 edges · 44 communities (32 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `50f5bee4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- getAuthToken
- devDependencies
- dependencies
- compilerOptions
- page.tsx
- route.ts
- resilientFetch.ts
- seed.ts
- layout.tsx
- README.md
- proxy.ts
- index.ts
- Pagination.tsx
- StepIndicator.tsx
- Table.tsx
- AGENTS.md
- eslint.config.mjs
- test-import-kk_2d871b8d.md
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- storage.ts
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `getAuthToken()` - 65 edges
2. `verifyToken()` - 65 edges
3. `useAuth()` - 29 edges
4. `compilerOptions` - 16 edges
5. `Button()` - 15 edges
6. `Card()` - 14 edges
7. `Input()` - 12 edges
8. `POST()` - 10 edges
9. `Badge()` - 10 edges
10. `Select()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `DetailKeluargaPage()` --references--> `jspdf`  [EXTRACTED]
  src/app/(dashboard)/keluarga/[id]/page.tsx → package.json
- `DetailKeluargaPage()` --references--> `qrcode`  [EXTRACTED]
  src/app/(dashboard)/keluarga/[id]/page.tsx → package.json
- `POST()` --references--> `xlsx`  [EXTRACTED]
  src/app/api/keluarga/import/route.ts → package.json
- `GET()` --references--> `xlsx`  [EXTRACTED]
  src/app/api/keluarga/import/template/route.ts → package.json
- `QrScannerPage()` --references--> `html5-qrcode`  [EXTRACTED]
  src/app/(dashboard)/qr-scanner/page.tsx → package.json

## Import Cycles
- None detected.

## Communities (44 total, 12 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.06
Nodes (67): EventBencana, EventBencanaPage(), EventDetail, fetcher(), PoskoInfo, STATUS_BENCANA_OPTIONS, TimelineItem, TIPE_BENCANA_OPTIONS (+59 more)

### Community 1 - "getAuthToken"
Cohesion: 0.07
Nodes (56): POST(), GET(), GET(), getRelativeTime(), GET(), GET(), GET(), GET() (+48 more)

### Community 2 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+32 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (30): bcryptjs, chart.js, jose, jsonwebtoken, jspdf-autotable, next, dependencies, bcryptjs (+22 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 5 - "page.tsx"
Cohesion: 0.19
Nodes (12): jspdf, jspdf, xlsx, ImportKeluargaPage(), EventOption, fetcher(), LaporanContent(), PoskoOption (+4 more)

### Community 6 - "route.ts"
Cohesion: 0.22
Nodes (14): POST(), normalizeHubungan(), normalizeJenisKelamin(), normalizeKategoriRentan(), POST(), VALID_HUNIAN, VALID_ZONA, cleanExpired() (+6 more)

### Community 7 - "resilientFetch.ts"
Cohesion: 0.11
Nodes (15): html5-qrcode, html5-qrcode, QrScannerPage(), OfflineQueueBanner(), menuItems, Sidebar(), TopBar(), ConfirmModal() (+7 more)

### Community 8 - "seed.ts"
Cohesion: 0.40
Nodes (3): adapter, pool, prisma

### Community 9 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 10 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 12 - "index.ts"
Cohesion: 0.50
Nodes (3): EventBencana, Posko, User

## Knowledge Gaps
- **143 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `xlsx` connect `page.tsx` to `getAuthToken`, `dependencies`, `route.ts`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `page.tsx`, `resilientFetch.ts`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `POST()` connect `route.ts` to `getAuthToken`, `page.tsx`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.05903866248693835 - nodes in this community are weakly interconnected._
- **Should `getAuthToken` be split into smaller, more focused modules?**
  _Cohesion score 0.06694677871148459 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._