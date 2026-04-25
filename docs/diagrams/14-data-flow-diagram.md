# Diagram 14 – Data Flow Diagrams (DFD)

## 14A – Level 0 DFD (Context Diagram)

```mermaid
flowchart LR
    DRIVER(["👤 Driver"])
    HAULIER(["🏢 Haulier"])
    ADMIN(["🔒 Admin"])
    GMAPS(["🗺️ Google Maps"])
    PGWY(["💳 Payment Gateway"])

    FF(["⬡ FreightFlex\nPlatform"])

    DRIVER -->|"Registration · Documents\nQuotes · Compliance data\nGPS location · Delivery proof"| FF
    FF -->|"Job offers · Booking confirmations\nPayment notifications · Invoices"| DRIVER

    HAULIER -->|"Job details · Supplier selection\nPayments · Handover signatures\nDelivery approvals"| FF
    FF -->|"Matched suppliers · Quote comparisons\nLive tracking · Status updates · Invoices"| HAULIER

    ADMIN -->|"Verification decisions · User actions\nDispute resolutions"| FF
    FF -->|"Platform KPIs · Pending verifications\nUser & job data"| ADMIN

    FF -->|"Addresses for geocoding\nRoutes for distance/ETA"| GMAPS
    GMAPS -->|"Coordinates · Distance\nDuration · Route data"| FF

    FF -->|"Payment orders · Payouts"| PGWY
    PGWY -->|"Payment webhooks\n(captured / failed)"| FF
```

## 14B – Level 1 DFD (Main Processes)

```mermaid
flowchart TB
    HAULIER(["🏢 Haulier"])
    DRIVER(["👤 Driver"])
    ADMIN(["🔒 Admin"])
    GMAPS(["🗺️ Google Maps"])
    PGWY(["💳 Payment Gateway"])

    P1["1.0\nUser\nManagement"]
    P2["2.0\nSupplier\nVerification"]
    P3["3.0\nJob Posting\n& Matching"]
    P4["4.0\nBooking &\nPayment"]
    P5["5.0\nCompliance\nWorkflow"]
    P6["6.0\nLive\nTracking"]
    P7["7.0\nRatings &\nReviews"]

    DS1[("Users DB")]
    DS2[("Documents Store\n(S3)")]
    DS3[("Jobs DB")]
    DS4[("Quotes DB")]
    DS5[("Payments DB")]
    DS6[("Compliance DB\n+ Media (S3)")]
    DS7[("Tracking Points\nDB")]
    DS8[("Ratings DB")]

    HAULIER -->|Register · Login · Profile| P1
    DRIVER -->|Register · Login · Profile| P1
    P1 <-->|User records| DS1

    DRIVER -->|Documents| P2
    ADMIN -->|Approve / Reject| P2
    P2 <-->|Document records| DS2
    P2 -->|Verification status| DS1

    HAULIER -->|Job details| P3
    P3 <-->|Address validation| GMAPS
    P3 <-->|Job records| DS3
    P3 <-->|Quote records| DS4
    DRIVER -->|Browse + Quote| P3

    HAULIER -->|Select supplier · Pay| P4
    P4 <-->|Payment orders| PGWY
    P4 <-->|Payment records| DS5
    P4 <-->|Job status updates| DS3

    DRIVER -->|Load code · Checklist · Delivery| P5
    HAULIER -->|Signatures · Approval| P5
    P5 <-->|Compliance records + media| DS6
    P5 -->|Payment release trigger| P4

    DRIVER -->|GPS coordinates| P6
    P6 <-->|Route / ETA| GMAPS
    P6 <-->|Tracking points| DS7
    HAULIER <--|Live location| P6

    HAULIER -->|Rate driver| P7
    DRIVER -->|Rate haulier| P7
    P7 <-->|Rating records| DS8
    P7 -->|Update avg rating| DS1
```

## 14C – Payment Data Flow (Detailed)

```mermaid
flowchart TD
    H(["🏢 Haulier"])
    D(["👤 Driver / Firm"])
    GW(["💳 Gateway\n(Razorpay/Stripe)"])

    subgraph FREIGHTFLEX["FreightFlex Platform"]
        PI["Payment\nInitiation"]
        WH["Webhook\nHandler"]
        ES["Escrow\nManager"]
        PR["Payment\nRelease"]
        INV["Invoice\nGenerator"]
    end

    subgraph STORES["Data Stores"]
        PDB[("Payments DB")]
        PE[("Payment Events\n(Idempotency)")]
        JDB[("Jobs DB")]
        S3I["☁️ S3\nInvoices"]
    end

    H -->|1. Initiate escrow| PI
    PI -->|2. Create order| GW
    GW -->|3. Payment URL| PI
    PI -->|4. Redirect to checkout| H
    H -->|5. Complete payment| GW
    GW -->|6. Webhook: payment.captured| WH

    WH -->|7. Verify HMAC signature| WH
    WH -->|8. Check idempotency| PE
    WH -->|9. Update status: ESCROWED| PDB
    WH -->|10. Update job: PAYMENT_SECURED| JDB
    WH -->|11. Notify supplier| D

    D -->|Job completed| ES
    ES -->|Trigger after approval| PR
    PR -->|12. Payout API call| GW
    GW -->|13. Payout to bank| D
    PR -->|14. Status: RELEASED| PDB
    PR -->|15. Generate PDF| INV
    INV -->|16. Upload PDF| S3I
    INV -->|17. Store URL| JDB
    PR -->|18. Notify driver| D
    PR -->|19. Notify haulier| H
```
