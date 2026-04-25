# FreightFlex – Diagrams Index

All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub, GitLab, and Notion.

## Diagram Catalogue

| # | Diagram | Type | Description |
|---|---|---|---|
| 01 | [System Architecture](./01-system-architecture.md) | Architecture | Full component topology — clients, API, services, data layer, external integrations |
| 02 | [Entity Relationship Diagram](./02-entity-relationship-diagram.md) | ERD | All 15 database tables with columns and relationships |
| 03 | [User Registration & Login Flow](./03-user-registration-login-flow.md) | Flowchart | Registration, email verification, login, forgot/reset password |
| 04 | [Supplier Onboarding Flow](./04-supplier-onboarding-flow.md) | Flowchart | Profile setup, document upload, admin verification, availability setup |
| 05 | [Job Posting & Matching Flow](./05-job-posting-matching-flow.md) | Flowchart | 4-step job form, Google Maps validation, supplier matching algorithm, quote submission |
| 06 | [Booking & Payment Flow](./06-booking-payment-flow.md) | Flowchart | Supplier selection, booking confirmation, escrow payment, payment release, invoice |
| 07 | [Compliance Workflow](./07-compliance-workflow.md) | Flowchart + Sequence | 3-step compliance chain — load code, dual sign-off handover, delivery report + approval |
| 08 | [Live Tracking & ETA Flow](./08-live-tracking-eta-flow.md) | Flowchart + Sequence + State | GPS data flow, ETA calculation, delay alerts, tracking lifecycle |
| 09 | [Job Status State Machine](./09-job-status-state-machine.md) | State Diagram | FSM for job, payment, and compliance record statuses with valid transitions |
| 10 | [End-to-End Sequence Diagrams](./10-end-to-end-sequence.md) | Sequence | Full happy-path across all actors, registration sequence, dispute resolution |
| 11 | [User Role & Navigation Flow](./11-user-role-navigation.md) | Flowchart + Journey | Role-based navigation map, haulier journey map, driver journey map |
| 12 | [Notification Flow](./12-notification-flow.md) | Flowchart | All notification triggers, channel routing (push/email/in-app), retry logic |
| 13 | [Deployment & Infrastructure](./13-deployment-infrastructure.md) | Architecture | AWS cloud infrastructure, CI/CD pipeline, environment promotion |
| 14 | [Data Flow Diagrams](./14-data-flow-diagram.md) | DFD | Level 0 context, Level 1 process breakdown, payment data flow detail |
| 15 | [Security & Authentication Flow](./15-security-flow.md) | Sequence + Flowchart | JWT auth lifecycle, RBAC matrix, file upload security pipeline |

## Diagram Types Used

| Mermaid Type | Used In |
|---|---|
| `flowchart TD/LR` | Process flows, system architecture, data flows |
| `sequenceDiagram` | Actor-to-system interaction, API call sequences |
| `stateDiagram-v2` | Job FSM, payment FSM, compliance FSM, tracking lifecycle |
| `erDiagram` | Database entity relationships |
| `journey` | User journey maps (haulier and driver experience) |

## How to View

- **GitHub / GitLab**: Diagrams render automatically in `.md` files.
- **VS Code**: Install the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.
- **Notion**: Paste Mermaid code into a code block with language set to `mermaid`.
- **Online editor**: Copy any diagram block to [mermaid.live](https://mermaid.live) for instant rendering.
