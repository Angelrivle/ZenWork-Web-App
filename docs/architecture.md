# ZenWork - Diagrama de Arquitectura

## Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "Frontend"
        A[Next.js 15 App Router] --> B[React Components]
        A --> C[Server Components]
        A --> D[API Routes]
    end

    subgraph "API Layer"
        D --> E[tRPC / REST]
        E --> F[Middleware]
        F --> G[Rate Limiter]
        F --> H[Auth Guard]
        F --> I[Input Validation]
    end

    subgraph "Services Layer"
        E --> J[Organization Service]
        E --> K[Project Service]
        E --> L[Issue Service]
        E --> M[Board Service]
        E --> N[Document Service]
        E --> O[Auth Service]
    end

    subgraph "Data Layer"
        J --> P[(PostgreSQL 16)]
        K --> P
        L --> P
        M --> P
        N --> P
        O --> P
        O --> Q[(Redis)]
    end

    subgraph "Event System"
        L --> R[Event Bus]
        M --> R
        N --> R
        R --> S[BullMQ Queue]
        S --> T[Notification Worker]
        S --> U[Webhook Worker]
    end

    subgraph "Integrations"
        T --> V[Email - Resend]
        T --> W[Discord Webhooks]
        U --> Y[Outbound Webhooks]
    end

    subgraph "External Services"
        A --> Z[OAuth - Discord/GitHub]
        P --> AA[S3/R2 - File Storage]
    end
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Routes
    participant Auth as Auth Service
    participant DB as PostgreSQL
    participant Redis as Redis

    U->>FE: Login
    FE->>API: POST /api/auth/login
    API->>Redis: Check Rate Limit
    API->>Auth: Verify Credentials
    Auth->>DB: Query User
    Auth->>Auth: Argon2id Verify
    alt 2FA Enabled
        Auth-->>FE: Requires 2FA
        U->>FE: Enter TOTP Code
        FE->>API: POST /api/auth/2fa/verify
        API->>Auth: Verify TOTP
    end
    Auth->>Auth: Generate JWT Access Token
    Auth->>Auth: Generate Refresh Token
    Auth->>DB: Store Refresh Token
    Auth-->>FE: Set Cookies + User Data
    FE-->>U: Dashboard
```

## Flujo de Webhooks Salientes

```mermaid
sequenceDiagram
    participant API as API Routes
    participant EB as Event Bus
    participant Q as BullMQ Queue
    participant W as Webhook Worker
    participant Ext as External URL
    participant DLQ as Dead Letter Queue

    API->>EB: Emit Event
    EB->>DB: Store Event
    EB->>Q: Add to Queue
    Q->>W: Process Job
    W->>DB: Get Webhook Config
    W->>W: Sign Payload (HMAC-SHA256)
    W->>Ext: POST Webhook
    alt Success
        Ext-->>W: 200 OK
        W->>DB: Mark as Delivered
    else Failure
        Ext-->>W: Error
        W->>DB: Mark as Failed
        W->>Q: Retry (Backoff)
        alt Max Retries
            W->>DLQ: Move to Dead Letter
        end
    end
```

## Diagrama de Base de Datos (Entidades Principales)

```mermaid
erDiagram
    User ||--o{ Membership : has
    User ||--o{ RefreshToken : has
    User ||--o| TwoFactorConfig : has
    User ||--o{ TwoFactorBackupCode : has
    User ||--o{ Issue : creates
    User ||--o{ Issue : assigns
    User ||--o{ IssueComment : authors
    User ||--o{ BoardCard : assigns
    User ||--o{ Webhook : creates
    User ||--o{ Invitation : sends

    Organization ||--o{ Membership : has
    Organization ||--o{ Project : has
    Organization ||--o{ Board : has
    Organization ||--o{ Document : has
    Organization ||--o{ Invitation : receives
    Organization ||--o{ Webhook : has
    Organization ||--o{ AuditLog : records
    Organization ||--o{ Notification : has

    Project ||--o{ Issue : contains
    Project ||--o{ IssueType : defines
    Project ||--o{ IssueStatus : defines
    Project ||--o{ Label : has
    Project ||--o{ Board : has

    Issue ||--o{ IssueComment : has
    Issue ||--o{ IssueLabel : has
    Issue ||--o{ IssueRelation : has
    Issue ||--o{ BoardCard : linked
    Issue ||--o{ Issue : subtasks

    Board ||--o{ BoardColumn : has
    BoardColumn ||--o{ BoardCard : has
    BoardCard ||--o{ CardChecklist : has
    CardChecklist ||--o{ CardChecklistItem : has

    Document ||--o{ Document : children
    Document ||--o{ DocumentEdit : edits

    Webhook ||--o{ WebhookDelivery : has
```

## Despliegue Docker

```mermaid
graph LR
    subgraph "Docker Compose"
        A[Next.js Web App :3000]
        B[Worker :4000]
        C[PostgreSQL :5432]
        D[Redis :6379]
        E[MinIO/S3 :9000]
    end

    A --> C
    A --> D
    A --> E
    B --> C
    B --> D

    subgraph "Production (Optional K8s)"
        F[Kubernetes Cluster]
        F --> G[Ingress Controller]
        G --> A
    end
```
