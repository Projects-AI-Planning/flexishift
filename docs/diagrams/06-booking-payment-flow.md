# Diagram 06 – Booking & Escrow Payment Flow

## 6A – Booking Confirmation Flow

```mermaid
flowchart TD
    A([Haulier views\nquote comparison table]) --> B[Review all submitted\nquotes: Name · Rating · Price]
    B --> C[/Select preferred\nsupplier/]
    C --> D["Confirmation modal:\nBook Supplier for £XXX?"]
    D --> E{Confirm?}
    E -->|Cancel| B
    E -->|Yes| F["POST /jobs/:id/book\nwith quoteId"]
    F --> G[Set job\nstatus = BOOKED]
    G --> H[Set selected\nsupplier on job]
    H --> I[Mark selected quote\nstatus = SELECTED]
    I --> J[Mark all other\nquotes = REJECTED]
    J --> K[Notify selected\nsupplier:\nYou have been booked!]
    K --> L[Notify rejected\nsuppliers:\nAnother supplier selected]
    L --> M([Redirect to\nEscrow Payment screen])

    style A fill:#DBEAFE,stroke:#2563EB
    style M fill:#DCFCE7,stroke:#16A34A
```

## 6B – Escrow Payment Flow

```mermaid
flowchart TD
    A([Haulier on\nPayment screen]) --> B["Display:\nJob ref · Supplier\nPrice · Tax · Total"]
    B --> C[/Select payment\nmethod:\nUPI · Card · Bank Transfer/]
    C --> D["POST /jobs/:id/payment/initiate"]
    D --> E[Create payment order\nat gateway]
    E --> F[Return payment URL\nto frontend]
    F --> G[Redirect haulier to\ngateway payment page]
    G --> H{Payment\noutcome}
    H -->|User cancels| I[Return to\nFreightFlex\nPayment Pending]
    H -->|Payment fails| J[Gateway webhook:\npayment.failed]
    H -->|Payment succeeds| K[Gateway webhook:\npayment.captured]
    J --> L[Update payment\nstatus = FAILED]
    L --> M[Notify haulier:\nPayment failed - Please retry]
    M --> A
    K --> N[Verify HMAC\nsignature]
    N --> O{Signature\nvalid?}
    O -->|No| P[Log error\nIgnore event]
    O -->|Yes| Q{Event already\nprocessed?}
    Q -->|Yes - duplicate| P
    Q -->|No| R[Update payment\nstatus = ESCROWED]
    R --> S[Update job\nstatus = PAYMENT_SECURED]
    S --> T[Notify supplier:\nPayment secured]
    T --> U[Show haulier:\nFunds held in escrow]
    U --> V([Awaiting job\nexecution])

    style A fill:#DBEAFE,stroke:#2563EB
    style V fill:#DCFCE7,stroke:#16A34A
    style M fill:#FEE2E2,stroke:#DC2626
    style P fill:#FEE2E2,stroke:#DC2626
```

## 6C – Payment Release & Invoice Flow

```mermaid
flowchart TD
    A([Haulier approves\ndelivery report]) --> B["POST /jobs/:id/compliance/approve"]
    B --> C[Set compliance\nstep3_approved_at]
    C --> D[Set job\nstatus = COMPLETED]
    D --> E[Trigger Payment\nRelease]
    E --> F[Call gateway\npayout API]
    F --> G{Payout\nsucceeds?}
    G -->|No| H[Retry up to 3x\nexponential backoff]
    H --> I{Still\nfailing?}
    I -->|Yes| J[Alert DevOps\nManual intervention]
    I -->|No| G
    G -->|Yes| K[Update payment\nstatus = RELEASED]
    K --> L[Record\nreleased_at timestamp]
    L --> M[Generate invoice]
    M --> N["Compile invoice data:\nJob ref · Parties · Price\nTax breakdown · Total"]
    N --> O[Render HTML template]
    O --> P[Convert to PDF\nvia Puppeteer]
    P --> Q["Upload PDF to\nAzure Blob Storage\ninvoices/FF-XXXX.pdf"]
    Q --> R[Store invoice URL\non job record]
    R --> S[Notify supplier:\nPayment released - Invoice ready]
    S --> T[Send rating\nprompt to both parties]
    T --> U([Job COMPLETED\nRating flow begins])

    style A fill:#DBEAFE,stroke:#2563EB
    style U fill:#DCFCE7,stroke:#16A34A
    style J fill:#FEE2E2,stroke:#DC2626
```

## 6D – Driver Dispute & Haulier Resolution Flow

```mermaid
flowchart TD
    A([Driver encounters\nan issue during job]) --> B[/Driver opens\nRaise Dispute form/]
    B --> C[Driver submits:\nReason + Evidence photos\n+ Description]
    C --> D["POST /jobs/:id/dispute\n{ reason, evidence }"]
    D --> E[Job status → DISPUTED\nPayment status → ON_HOLD]
    E --> F[Notify haulier:\nDriver raised a dispute]
    F --> G([Haulier receives\ndispute notification])

    G --> H[Haulier reviews:\nDriver claim + Evidence\non web dashboard]
    H --> I{Haulier\ndecision}

    I -->|Resolve - Accept driver claim| J["POST /jobs/:id/dispute/resolve\n{ resolution: accepted }"]
    I -->|Reject - Dispute is invalid| K["POST /jobs/:id/dispute/resolve\n{ resolution: rejected }"]
    I -->|No response within 24h| L[System auto-escalates\nto Admin]

    J --> M[Job status → COMPLETED\nPayment → RELEASE to driver]
    M --> N[Notify driver:\nDispute resolved - Payment released]
    N --> O([Job COMPLETED\nInvoice generated])

    K --> P[Notify driver:\nHaulier rejected your dispute]
    P --> Q{Driver accepts\nrejection?}
    Q -->|Yes - close dispute| R[Dispute closed\nOriginal outcome stands]
    Q -->|No - escalate| S[Driver escalates\nto Admin within 48h]

    S --> L
    L --> T[Admin reviews:\nFull dispute thread\nEvidence from both parties]
    T --> U{Admin\nfinal decision}

    U -->|Rule in favour of driver| V[Release payment\nto driver]
    U -->|Rule in favour of haulier| W[Refund payment\nto haulier]

    V --> X[Notify both parties\nof Admin decision]
    W --> X
    X --> Y[Job marked\nDISPUTE_RESOLVED]
    Y --> Z([Case closed\nRating flow begins])

    R --> Z

    style A fill:#FEF9C3,stroke:#CA8A04
    style G fill:#DBEAFE,stroke:#2563EB
    style O fill:#DCFCE7,stroke:#16A34A
    style Z fill:#DCFCE7,stroke:#16A34A
    style L fill:#FEE2E2,stroke:#DC2626
    style M fill:#DCFCE7,stroke:#16A34A
    style V fill:#DCFCE7,stroke:#16A34A
    style W fill:#FEE2E2,stroke:#DC2626
```

## 6E – Dispute Escalation Sequence (Timeline View)

```mermaid
sequenceDiagram
    actor Driver
    participant App as Driver App
    participant API as FreightFlex API
    participant DB as Database
    actor Haulier
    participant Web as Haulier Web
    actor Admin
    participant ADM as Admin Panel

    Driver->>App: Raise dispute with reason + evidence
    App->>API: POST /jobs/:id/dispute
    API->>DB: job.status = DISPUTED
    API->>DB: payment.status = ON_HOLD
    API->>Web: Push: Driver raised a dispute - Review within 24h
    API-->>App: Dispute submitted - Awaiting haulier response

    Note over Haulier,Web: Haulier has 24 hours to respond

    alt Haulier resolves dispute
        Haulier->>Web: Review evidence and accept driver claim
        Web->>API: POST /jobs/:id/dispute/resolve { accepted }
        API->>DB: job.status = COMPLETED
        API->>DB: payment.status = RELEASED
        API->>App: Push: Dispute resolved - Payment released
        API-->>Web: Resolution recorded

    else Haulier rejects dispute
        Haulier->>Web: Review evidence and reject claim
        Web->>API: POST /jobs/:id/dispute/resolve { rejected }
        API->>App: Push: Haulier rejected dispute - Escalate or accept?
        Driver->>App: Choose to escalate within 48h
        App->>API: POST /jobs/:id/dispute/escalate
        API->>DB: dispute.escalated_at = now()
        API->>ADM: Push: New escalated dispute requires review

    else No haulier response within 24h
        API->>DB: Auto-escalate dispute
        API->>ADM: Push: Dispute auto-escalated - No haulier response
    end

    Note over Admin,ADM: Admin reviews all evidence and thread

    Admin->>ADM: Review driver claim + haulier response + evidence
    alt Admin rules for driver
        Admin->>ADM: Release payment to driver
        ADM->>API: POST /admin/disputes/:id/resolve { favour: driver }
        API->>DB: payment.status = RELEASED
        API->>App: Push: Admin ruled in your favour - Payment released
        API->>Web: Push: Admin decision - Payment released to driver
    else Admin rules for haulier
        Admin->>ADM: Refund payment to haulier
        ADM->>API: POST /admin/disputes/:id/resolve { favour: haulier }
        API->>DB: payment.status = REFUNDED
        API->>App: Push: Admin ruled in haulier favour - Dispute closed
        API->>Web: Push: Admin decision - Payment refunded to you
    end

    API->>DB: job.status = DISPUTE_RESOLVED
    API->>App: Rating prompt sent
    API->>Web: Rating prompt sent
```
