# Diagram 09 – Job Status State Machine (FSM)

## 9A – Full Job Lifecycle State Diagram

```mermaid
stateDiagram-v2
    direction LR

    [*] --> OPEN : Haulier posts job\nPOST /jobs

    OPEN --> BOOKED : Haulier selects supplier\nPOST /jobs/:id/book

    OPEN --> CANCELLED : Haulier cancels\nbefore booking

    BOOKED --> PAYMENT_PENDING : Haulier initiates\nescrow payment

    BOOKED --> CANCELLED : Haulier cancels\nbefore payment

    PAYMENT_PENDING --> PAYMENT_SECURED : Gateway webhook:\npayment.captured

    PAYMENT_PENDING --> BOOKED : Payment fails —\nhaulier retries

    PAYMENT_SECURED --> IN_TRANSIT : Compliance Step 2\ncomplete — both signed

    PAYMENT_SECURED --> CANCELLED : Haulier cancels\n(refund triggered)

    IN_TRANSIT --> DELIVERY_SUBMITTED : Driver submits\ndelivery report

    DELIVERY_SUBMITTED --> COMPLETED : Haulier approves\ndelivery

    DELIVERY_SUBMITTED --> DISPUTED : Haulier raises\ndispute

    DISPUTED --> COMPLETED : Dispute resolved\nin supplier's favour

    DISPUTED --> CANCELLED : Dispute resolved\nin haulier's favour\n(refund triggered)

    COMPLETED --> [*]
    CANCELLED --> [*]

    note right of OPEN
        Supplier matching active
        Quotes can be submitted
    end note

    note right of IN_TRANSIT
        GPS tracking active
        ETA calculated live
    end note

    note right of COMPLETED
        Payment released
        Invoice generated
        Rating prompt sent
    end note
```

## 9B – Job Status Transitions with Actors

```mermaid
flowchart LR
    OPEN(["🟡 OPEN"])
    BOOKED(["🔵 BOOKED"])
    PP(["🟠 PAYMENT\nPENDING"])
    PS(["🟢 PAYMENT\nSECURED"])
    IT(["🚛 IN\nTRANSIT"])
    DS(["📦 DELIVERY\nSUBMITTED"])
    COMP(["✅ COMPLETED"])
    DISP(["❌ DISPUTED"])
    CANC(["🚫 CANCELLED"])

    OPEN -->|Haulier selects supplier| BOOKED
    OPEN -->|Haulier cancels| CANC

    BOOKED -->|Haulier pays| PP
    BOOKED -->|Haulier cancels| CANC

    PP -->|Gateway: payment captured| PS
    PP -->|Payment fails| BOOKED

    PS -->|Both parties sign\nhandover check| IT
    PS -->|Haulier cancels\nrefund triggered| CANC

    IT -->|Driver submits\ndelivery proof| DS

    DS -->|Haulier approves| COMP
    DS -->|Haulier disputes| DISP

    DISP -->|Resolved: supplier wins| COMP
    DISP -->|Resolved: haulier wins| CANC

    style OPEN fill:#FEF3C7,stroke:#D97706
    style BOOKED fill:#DBEAFE,stroke:#2563EB
    style PP fill:#FED7AA,stroke:#EA580C
    style PS fill:#DCFCE7,stroke:#16A34A
    style IT fill:#E0F2FE,stroke:#0284C7
    style DS fill:#F3E8FF,stroke:#9333EA
    style COMP fill:#DCFCE7,stroke:#15803D
    style DISP fill:#FEE2E2,stroke:#DC2626
    style CANC fill:#F1F5F9,stroke:#64748B
```

## 9C – Payment Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Haulier initiates payment\nGateway order created

    PENDING --> ESCROWED : Webhook: payment.captured\nFunds held in nodal account

    PENDING --> FAILED : Webhook: payment.failed\nHaulier notified

    FAILED --> PENDING : Haulier retries payment

    ESCROWED --> RELEASED : Haulier approves delivery\nPayout sent to supplier

    ESCROWED --> REFUNDED : Job cancelled\nafter escrow

    RELEASED --> [*]
    REFUNDED --> [*]
    FAILED --> [*] : Booking cancelled
```

## 9D – Compliance Record State Machine

```mermaid
stateDiagram-v2
    direction TB

    [*] --> Step1_Pending : Job reaches PAYMENT_SECURED

    Step1_Pending --> Step1_Complete : Driver enters\ncorrect load code

    Step1_Complete --> Step2_ChecklistSubmitted : Driver fills checklist\nand uploads photos

    Step2_ChecklistSubmitted --> Step2_DriverSigned : Driver signs digitally

    Step2_DriverSigned --> Step2_Complete : Haulier signs digitally\nJob → IN_TRANSIT

    Step2_Complete --> Step3_DeliverySubmitted : Driver submits\ndelivery report

    Step3_DeliverySubmitted --> Step3_Approved : Haulier approves\nJob → COMPLETED

    Step3_DeliverySubmitted --> Step3_Disputed : Haulier disputes\nJob → DISPUTED

    Step3_Approved --> [*]
    Step3_Disputed --> [*]
```
