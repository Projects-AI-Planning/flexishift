# Diagram 13 – Deployment & Infrastructure Diagram

## 13A – Cloud Infrastructure (AWS)

```mermaid
graph TB
    subgraph INTERNET["INTERNET"]
        USER_WEB["🌐 Web Users\n(Haulier / Admin)"]
        USER_MOB["📱 Mobile Users\n(Driver)"]
    end

    subgraph AWS["AWS CLOUD"]
        subgraph EDGE["EDGE"]
            CF["CloudFront CDN\n(Static Assets)"]
            R53["Route 53\n(DNS)"]
        end

        subgraph PUBLIC_SUBNET["PUBLIC SUBNET"]
            ALB["Application\nLoad Balancer\n(ALB)\nSSL Termination"]
            NAT["NAT Gateway"]
        end

        subgraph PRIVATE_SUBNET_API["PRIVATE SUBNET — Application"]
            ECS_API["ECS Fargate\nPython FastAPI\nUvicorn+Gunicorn\n(auto-scaling)"]
            ECS_WS["ECS Fargate\nFastAPI WebSocket\n+ Celery Workers\n(auto-scaling)"]
        end

        subgraph PRIVATE_SUBNET_DATA["PRIVATE SUBNET — Data"]
            RDS_P[("RDS MySQL 8.0\n(Primary)\nMulti-AZ")]
            RDS_R[("RDS MySQL 8.0\n(Read Replica)\nAnalytics + Matching)")]
            REDIS[("ElastiCache Redis\n(Cache + Pub/Sub)")]
        end

        subgraph STORAGE["STORAGE"]
            S3["S3 Buckets\n• freightflex-docs\n• freightflex-photos\n• freightflex-invoices"]
        end

        subgraph SECURITY["SECURITY & OPS"]
            SM["Secrets Manager\n(DB creds · JWT keys\nAPI keys)"]
            CW["CloudWatch\n(Logs + Alerts)"]
            ECR["ECR\n(Container Registry)"]
            WAF["AWS WAF\n(Rate limiting\nDDoS protection)"]
        end
    end

    subgraph EXTERNAL["EXTERNAL SERVICES"]
        MAPS["Google Maps Platform"]
        PGWY["Razorpay / Stripe"]
        FCM["Firebase FCM"]
        SG["SendGrid"]
        SENTRY["Sentry\n(Error tracking)"]
    end

    subgraph CICD["CI/CD PIPELINE"]
        GH["GitHub\n(Source)"]
        GHA["GitHub Actions\n(Pytest · Playwright\nDocker Build · Deploy)"]
        GHA --> ECR
        ECR --> ECS_API
        ECR --> ECS_WS
    end

    USER_WEB -->|HTTPS| R53
    USER_MOB -->|HTTPS / WSS| R53
    R53 --> CF
    R53 --> ALB
    CF -->|Static build| S3
    ALB --> WAF
    WAF --> ECS_API
    WAF --> ECS_WS

    ECS_API --> RDS_P
    ECS_API --> RDS_R
    ECS_API --> REDIS
    ECS_API --> S3
    ECS_API --> SM
    ECS_API --> CW

    ECS_WS --> REDIS
    ECS_WS --> RDS_P
    ECS_WS --> CW

    ECS_API --> MAPS
    ECS_API --> PGWY
    ECS_API --> FCM
    ECS_API --> SG
    ECS_API --> SENTRY

    ECS_API -->|via| NAT
    ECS_WS -->|via| NAT

    style AWS fill:#FFF7ED,stroke:#EA580C
    style INTERNET fill:#EFF6FF,stroke:#2563EB
    style EXTERNAL fill:#F0FDF4,stroke:#16A34A
    style CICD fill:#FDF4FF,stroke:#9333EA
```

## 13B – CI/CD Pipeline Flow

```mermaid
flowchart LR
    A([Developer\npushes code]) --> B{Branch?}

    B -->|feature branch| C[GitHub Actions:\nPR Checks]
    C --> D[Unit tests\nJest / Pytest]
    D --> E[Integration tests\nSupertest]
    E --> F[Snyk dependency\nscan]
    F --> G[ESLint / TypeScript\ntype check]
    G --> H{All checks\npass?}
    H -->|No| I[❌ PR blocked\nFix and re-push]
    H -->|Yes| J[✅ PR ready\nfor review]
    J --> K[Code review\nmin 1 approver]
    K --> L[Merge to develop]

    B -->|develop branch| M[GitHub Actions:\nStaging Deploy]
    M --> N[Build Docker\nimages]
    N --> O[Push to ECR]
    O --> P[ECS rolling\ndeploy to staging]
    P --> Q[Run E2E tests\nPlaywright]
    Q --> R{Tests\npass?}
    R -->|No| S[❌ Alert team\nRollback]
    R -->|Yes| T[✅ Staging\nready]

    B -->|main branch| U[GitHub Actions:\nProduction Deploy]
    U --> V[Build Docker\nimages tagged]
    V --> W[Push to ECR]
    W --> X[ECS rolling\ndeploy to production]
    X --> Y[Smoke tests\non production]
    Y --> Z{Smoke tests\npass?}
    Z -->|No| AA[Auto-rollback\nto previous ECS task]
    Z -->|Yes| AB([✅ Production\ndeployment complete])

    style A fill:#DBEAFE,stroke:#2563EB
    style AB fill:#DCFCE7,stroke:#16A34A
    style I fill:#FEE2E2,stroke:#DC2626
    style S fill:#FEE2E2,stroke:#DC2626
    style AA fill:#FEF3C7,stroke:#D97706
```

## 13C – Environment Promotion Flow

```mermaid
flowchart LR
    DEV["💻 Development\n(Local Docker Compose)\nDev team\nUnit + Integration tests"]
    STG["🔵 Staging\n(AWS ECS Fargate)\nQA + UAT\nE2E + Performance tests"]
    PROD["🟢 Production\n(AWS ECS Fargate)\nLive users\nMonitored 24/7"]

    DEV -->|Merge to develop\nGitHub Actions| STG
    STG -->|UAT passed\nSponsor sign-off\nMerge to main| PROD

    DEV -.->|Shared config| CONFIG["Secrets Manager\n(per environment)"]
    STG -.-> CONFIG
    PROD -.-> CONFIG
```
