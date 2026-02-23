# IMaxart Platform — Architecture Vision

## Idea

IMaxart Platform to self-hosted, open-source platforma infrastrukturalna dla projektów webowych. Jeden deploy obsługuje wiele projektów. Inspiracja: PostHog — jeden produkt, wiele modułów.

Repo: `imaxart/platform`

---

## Moduły

Wszystkie moduły żyją pod jednym subdomain `platform.<domena>`, z wyjątkiem statusu, który ma publiczną stronę pod `status.<domena>`.

| Moduł | Opis | Status |
|-------|------|--------|
| **Analytics** | Statystyki odwiedzających, sesje, eventy, referrery, user journeys, feature flagi | ✅ MVP gotowe |
| **Status** | Monitoring uptime + publiczne status pages | ✅ MVP gotowe |
| **Error Tracking** | Stack traces, source maps, grupowanie błędów | 🔜 Następny |

---

## URL structure

### Domena główna (imaxart.com)

| URL | Co widać |
|-----|----------|
| `platform.imaxart.com` | Landing page projektu |
| `platform.imaxart.com/docs` | Dokumentacja |
| `platform.imaxart.com/app` | Dashboard multi-tenant (logowanie, wszystkie projekty) |

### Per-projekt

| URL | Co widać |
|-----|----------|
| `platform.ingramkalina.pl` | Analytics, feature flagi, error tracking, konfiguracja statusu |
| `status.ingramkalina.pl` | Publiczna status page |
| `platform.swieckaceremonia.com` | Analytics, feature flagi, error tracking, konfiguracja statusu |
| `status.swieckaceremonia.com` | Publiczna status page |

---

## Architektura

```mermaid
graph TB
    subgraph "imaxart/platform (jeden deploy)"
        PL["Platform<br/>analytics, feature flagi,<br/>error tracking, konfiguracja statusu"]
        ST["Status<br/>publiczne status pages"]
        AA["Wbudowany admin auth<br/>teams, projekty, role"]
        PG[("PostgreSQL")]

        AA --> PL
        AA --> ST
        PL --> PG
        ST --> PG
    end

    subgraph "Projekty"
        P1["ingramkalina.pl"]
        P2["swieckaceremonia.com"]
        P3["ministry-life.app"]
    end

    P1 -->|"tracker + error SDK"| PL
    P2 -->|"tracker + error SDK"| PL
    P3 -->|"tracker + error SDK"| PL

    style PL fill:#4CAF50,color:#fff
    style ST fill:#2196F3,color:#fff
    style AA fill:#E91E63,color:#fff
    style PG fill:#FF5722,color:#fff
```

- **Multi-tenant**: jeden deploy, wiele projektów. Routing po `Host` header.
- **Single-tenant**: ten sam kod. Jeden projekt w bazie = uproszczony UI, bez project switchera.
- **Admin auth**: wbudowany. `docker compose up` i gotowe.

---

## Jak to wygląda na przykładzie

```mermaid
graph TB
    subgraph "Dokploy: ingramkalina.pl"
        FE["frontend<br/>TanStack Start"]
    end

    subgraph "Dokploy: IMaxart Platform"
        PL["Platform app<br/>analytics, flagi, errors, config"]
        ST["Status app<br/>publiczne status pages"]
        PG[("PostgreSQL")]
        PL --> PG
        ST --> PG
    end

    FE -->|"tracker script + error SDK"| PL

    subgraph "DNS"
        D1["ingramkalina.pl → frontend"]
        D2["platform.ingramkalina.pl → Platform app"]
        D3["status.ingramkalina.pl → Status app"]
    end

    style FE fill:#607D8B,color:#fff
    style PL fill:#4CAF50,color:#fff
    style ST fill:#2196F3,color:#fff
    style PG fill:#FF5722,color:#fff
```

- Frontend ma `<script>` tag do trackera + error SDK — zero integracji backendowej
- Dodanie kolejnego projektu = wpis w bazie + 2 DNS rekordy (`platform.*` + `status.*`)

---

## Organizacja i role

```mermaid
graph TB
    SA["Super Admin<br/>(env: SUPER_ADMIN_EMAIL)"]

    subgraph "User: Ingram"
        direction TB
    end

    subgraph "Team: IMaxart"
        P1["Project: Ingram Kalina"]
        P2["Project: Świecka Ceremonia"]
        P1 --> D1["ingramkalina.pl"]
        P1 --> D1b["app.ingramkalina.pl"]
        P2 --> D2["swieckaceremonia.com"]
    end

    subgraph "Team: Zbór"
        P3["Project: Ministry Life"]
        P3 --> D3["ministry-life.app"]
    end

    subgraph "User: Freelancer (bez teamu)"
        P4["Project: portfolio.dev"]
        P4 --> D4["portfolio.dev"]
    end

    SA -->|"pełna kontrola"| P1
    SA -->|"pełna kontrola"| P2
    SA -->|"pełna kontrola"| P3

    style SA fill:#F44336,color:#fff
    style P1 fill:#4CAF50,color:#fff
    style P2 fill:#4CAF50,color:#fff
    style P3 fill:#4CAF50,color:#fff
    style P4 fill:#4CAF50,color:#fff
```

### Elastyczność

- **User bez teamu** — ma własne projekty bezpośrednio (freelancer, self-hoster z jedną stroną)
- **User w wielu teamach** — różne role w każdym (owner w IMaxart, member w Zbór)
- **Team bez projektów** — organizacja istnieje, projekty dodaje się później
- **Projekt bez teamu** — należy bezpośrednio do usera

### Role

| Rola | Zakres | Uprawnienia |
|------|--------|-------------|
| **Super Admin** | Cała instancja | Pełna kontrola, zarządzanie userami, tworzony z env |
| **Owner** | Team | Zarządzanie teamem, usuwanie projektów, zapraszanie |
| **Admin** | Team / Project | Konfiguracja projektów, zarządzanie członkami |
| **Member** | Team / Project | Dostęp do dashboardów, konfiguracja feature flag |
| **Viewer** | Team / Project | Tylko podgląd danych |

### Super Admin — pierwsze uruchomienie

```yaml
# docker-compose.yml / .env
SUPER_ADMIN_EMAIL=ingram@imaxart.com
SUPER_ADMIN_PASSWORD=changeme123
```

Przy pierwszym starcie platforma tworzy konto super admina z tych zmiennych. Super admin widzi wszystko, zarządza userami, teamami, projektami. Hasło powinno być zmienione po pierwszym logowaniu.

### Zarządzanie w platform app

`platform.imaxart.com/app` zawiera:

- **Users** — lista userów, invite, blokowanie, reset hasła
- **Teams** — tworzenie, edycja, przypisywanie członków z rolami
- **Projects** — tworzenie, przypisywanie do teamu lub usera, konfiguracja domen
- **Domains** — zarządzanie domenami per projekt, weryfikacja DNS

Super admin widzi wszystko. Owner widzi swój team. User widzi swoje projekty.

---

## Data model

```mermaid
erDiagram
    USER ||--o{ TEAM_MEMBER : "należy do teamów"
    USER ||--o{ PROJECT_MEMBER : "należy do projektów"
    USER ||--o{ PROJECT : "posiada (bez teamu)"
    TEAM ||--o{ TEAM_MEMBER : "ma członków"
    TEAM ||--o{ PROJECT : "ma projekty"
    PROJECT ||--o{ PROJECT_MEMBER : "ma członków"
    PROJECT ||--o{ DOMAIN : "ma domeny"

    USER {
        uuid id PK
        string email
        string password_hash
        boolean is_super_admin
    }

    TEAM {
        uuid id PK
        string name
        string slug
    }

    TEAM_MEMBER {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        enum role "owner | admin | member | viewer"
    }

    PROJECT {
        uuid id PK
        uuid team_id FK "nullable — null = projekt usera"
        uuid owner_id FK "user który stworzył"
        string name
        string slug
    }

    PROJECT_MEMBER {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        enum role "admin | member | viewer"
    }

    DOMAIN {
        uuid id PK
        uuid project_id FK
        string domain
        boolean is_primary
    }
```

- **User** — konto na platformie. `is_super_admin` z env przy pierwszym starcie.
- **Team** — opcjonalna organizacja. User może mieć projekty bez teamu.
- **Team Member** — user ↔ team z rolą. User może być w wielu teamach.
- **Project** — `team_id` nullable. Jeśli null → projekt należy bezpośrednio do `owner_id`.
- **Project Member** — bezpośredni dostęp do projektu (niezależnie od teamu).
- **Domain** — konkretna domena przypisana do projektu.

### Logika dostępu

User ma dostęp do projektu jeśli:
1. Jest super adminem, **lub**
2. Jest ownerem/adminem teamu do którego należy projekt, **lub**
3. Jest bezpośrednio w `project_members`, **lub**
4. Jest `owner_id` projektu

---

## Monorepo — struktura

```
imaxart/platform
├── apps/
│   ├── platform/           # TanStack Start — analytics, flagi, errors, konfiguracja
│   └── status/             # TanStack Start — publiczne status pages
├── packages/
│   ├── ui/                 # shadcn/ui, design tokens
│   ├── db/                 # Drizzle schemas, migracje
│   ├── auth/               # wbudowany admin auth (users, sesje, role, middleware)
│   ├── shared/             # Zod, typy, helpery
│   ├── sdk/                # @imaxart/analytics, @imaxart/errors (publiczne NPM)
│   └── tsconfig/           # współdzielona konfiguracja TS
├── docker-compose.yml
└── turbo.json
```

```mermaid
graph TB
    subgraph "imaxart/platform (Turborepo)"
        subgraph "apps/"
            A1["platform/<br/>analytics, flagi, errors, config"]
            A2["status/<br/>publiczne status pages"]
        end

        subgraph "packages/"
            P1["ui/"]
            P2["db/"]
            P3["auth/"]
            P4["shared/"]
            P5["sdk/"]
        end

        A1 --> P1
        A1 --> P2
        A1 --> P3
        A1 --> P4
        A2 --> P1
        A2 --> P2
        A2 --> P3
        A2 --> P4
    end

    style A1 fill:#4CAF50,color:#fff
    style A2 fill:#2196F3,color:#fff
    style P3 fill:#E91E63,color:#fff
```

---

## Baza danych

Jeden PostgreSQL, schema separation.

```mermaid
graph TB
    subgraph "PostgreSQL — imaxart"
        subgraph "Schema: admin"
            T1["users"]
            T2["sessions"]
            T3["teams"]
            T4["team_members"]
            T5["projects"]
            T6["project_members"]
            T7["domains"]
        end

        subgraph "Schema: analytics"
            T8["page_views"]
            T9["sessions"]
            T10["events"]
            T11["feature_flags"]
            T12["flag_evaluations"]
        end

        subgraph "Schema: errors"
            T13["error_events"]
            T14["error_groups"]
            T15["source_maps"]
        end

        subgraph "Schema: status"
            T16["services"]
            T17["endpoints"]
            T18["checks"]
            T19["rollups_daily"]
        end
    end

    T5 -->|"project_id"| T8
    T5 -->|"project_id"| T13
    T5 -->|"project_id"| T16

    style T1 fill:#E91E63,color:#fff
    style T2 fill:#E91E63,color:#fff
    style T3 fill:#E91E63,color:#fff
    style T4 fill:#E91E63,color:#fff
    style T5 fill:#E91E63,color:#fff
    style T6 fill:#E91E63,color:#fff
    style T7 fill:#E91E63,color:#fff
    style T11 fill:#4CAF50,color:#fff
    style T12 fill:#4CAF50,color:#fff
    style T13 fill:#FF9800,color:#fff
    style T14 fill:#FF9800,color:#fff
    style T15 fill:#FF9800,color:#fff
```

---

## Docker Compose

```yaml
# docker-compose.yml
services:
  platform:
    build: ./apps/platform
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/imaxart
    labels:
      - "traefik.http.routers.platform.rule=HostRegexp(`platform.{domain:.+}`)"

  status:
    build: ./apps/status
    environment:
      - DATABASE_URL=postgresql://postgres:pass@postgres:5432/imaxart
    labels:
      - "traefik.http.routers.status.rule=HostRegexp(`status.{domain:.+}`)"

  postgres:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- Traefik wildcard routing — `platform.*` i `status.*` do właściwych kontenerów
- 2 kontenery (Bun runtime) + PostgreSQL — ~150-200MB RAM
- Self-hoster: `docker compose up` i gotowe

---

## Dodawanie nowego projektu

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant App as platform.imaxart.com/app
    participant DNS as Cloudflare DNS
    participant Traefik as Traefik

    Dev->>App: Utwórz projekt "Świecka Ceremonia"
    App->>App: Zapisz Project + Domain w DB
    Dev->>DNS: CNAME: platform.swieckaceremonia.com → serwer
    Dev->>DNS: CNAME: status.swieckaceremonia.com → serwer
    Note over Traefik: Wildcard routing — automatycznie<br/>kieruje do właściwego kontenera
    Dev->>Dev: Dodaj tracker + error SDK do strony
    Note over Dev: Gotowe. Żadnych nowych kontenerów.
```

---

## Plan realizacji

```mermaid
gantt
    title Pragmatyczny plan implementacji
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Faza 1: Monorepo + Auth
    Inicjalizacja Turborepo           :f1a, 2025-02-01, 3d
    Migracja analytics do apps/platform :f1b, after f1a, 2d
    Migracja status do apps/status    :f1c, after f1b, 2d
    Wyciągnij packages/ui             :f1d, after f1c, 3d
    Wyciągnij packages/db             :f1e, after f1d, 3d
    Zbuduj packages/auth              :f1f, after f1e, 5d
    Teams, projekty, role             :f1g, after f1f, 4d

    section Faza 2: Stabilizacja
    Migruj status z SQLite na PG      :f2a, after f1g, 3d
    Jeden docker-compose.yml          :f2b, after f2a, 2d
    Wildcard Traefik routing          :f2c, after f2b, 2d
    Unified platform UI               :f2d, after f2c, 5d

    section Faza 3: Error Tracking
    apps/platform — error ingest      :f3a, after f2d, 5d
    Source maps + deobfuskacja        :f3b, after f3a, 4d
    Dashboard + grupowanie błędów     :f3c, after f3b, 4d
    SDK: @imaxart/errors              :f3d, after f3c, 3d

    section Faza 4: OSS Release
    Landing page + docs               :f4a, after f3d, 5d
    env.example + docker compose up   :f4b, after f4a, 3d
    Pierwsze publiczne release        :milestone, after f4b, 0d
```

---

## Tech stack

| Warstwa | Technologia |
|---------|-------------|
| Runtime | Bun |
| Package manager | pnpm |
| Framework | TanStack Start (React 19 SSR) |
| Baza danych | PostgreSQL 17 |
| ORM | Drizzle |
| UI | shadcn/ui + Tailwind CSS v4 |
| Walidacja | Zod |
| Testy | Vitest |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Docker Compose + Dokploy |
| Reverse proxy | Traefik (wildcard routing) |
| DNS | Cloudflare |
| Licencja | AGPL-3.0 (platforma), MIT (SDK) |

---

## Podsumowanie decyzji

| Pytanie | Decyzja |
|---------|---------|
| Repo | `imaxart/platform` — monorepo (Turborepo) |
| Apps | `apps/platform` (analytics + flagi + errors + config) i `apps/status` (publiczne strony) |
| Subdomains | `platform.<domena>` — wszystko, `status.<domena>` — publiczna strona |
| Deploy | 2 kontenery + PostgreSQL, jeden docker-compose |
| Baza danych | Jeden PostgreSQL, schema separation |
| Auth | Wbudowany via `packages/auth` |
| Organizacja | Team → Project → Domain, role: owner / admin / member / viewer |
| Multi-tenancy | `project_id` filtering, single/multi automatycznie |
| Open source | AGPL-3.0, `docker compose up` must just work |
| Priorytet | Monorepo → auth + role → stabilizacja → error tracking → OSS release |