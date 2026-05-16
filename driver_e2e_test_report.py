from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from datetime import date

OUTPUT = "/home/user/Freightflex/FreightFlex_Driver_E2E_Test_Report.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="FreightFlex Driver App — E2E Test Report",
    author="Claude Code QA",
)

styles = getSampleStyleSheet()

# ── Custom styles ────────────────────────────────────────────────────────────
BRAND   = colors.HexColor("#041627")
AMBER   = colors.HexColor("#F59E0B")
RED     = colors.HexColor("#DC2626")
ORANGE  = colors.HexColor("#EA580C")
BLUE    = colors.HexColor("#1D4ED8")
GREEN   = colors.HexColor("#16A34A")
LGREY   = colors.HexColor("#F1F5F9")
DGREY   = colors.HexColor("#475569")

def sty(name, **kw):
    s = ParagraphStyle(name, **kw)
    return s

S = {
    "cover_title": sty("cover_title", fontSize=28, leading=34, textColor=BRAND,
                       fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6),
    "cover_sub":   sty("cover_sub",   fontSize=13, leading=18, textColor=DGREY,
                       fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4),
    "cover_date":  sty("cover_date",  fontSize=10, leading=14, textColor=DGREY,
                       fontName="Helvetica", alignment=TA_CENTER),
    "h1":  sty("h1",  fontSize=15, leading=20, textColor=BRAND,
               fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6),
    "h2":  sty("h2",  fontSize=12, leading=16, textColor=BRAND,
               fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4),
    "h3":  sty("h3",  fontSize=10, leading=14, textColor=DGREY,
               fontName="Helvetica-Bold", spaceBefore=6, spaceAfter=3),
    "body": sty("body", fontSize=9, leading=13, textColor=colors.black,
                fontName="Helvetica", spaceAfter=4, alignment=TA_JUSTIFY),
    "bullet": sty("bullet", fontSize=9, leading=13, textColor=colors.black,
                  fontName="Helvetica", leftIndent=12, spaceAfter=3),
    "code":  sty("code",  fontSize=8, leading=11, textColor=colors.HexColor("#1e293b"),
                 fontName="Courier", backColor=LGREY, leftIndent=8, rightIndent=8,
                 spaceAfter=4, spaceBefore=2),
    "tag_crit":  sty("tag_crit",  fontSize=8, leading=10, textColor=colors.white,
                     fontName="Helvetica-Bold", backColor=RED, alignment=TA_CENTER),
    "tag_high":  sty("tag_high",  fontSize=8, leading=10, textColor=colors.white,
                     fontName="Helvetica-Bold", backColor=ORANGE, alignment=TA_CENTER),
    "tag_med":   sty("tag_med",   fontSize=8, leading=10, textColor=colors.white,
                     fontName="Helvetica-Bold", backColor=BLUE, alignment=TA_CENTER),
    "tag_pass":  sty("tag_pass",  fontSize=8, leading=10, textColor=colors.white,
                     fontName="Helvetica-Bold", backColor=GREEN, alignment=TA_CENTER),
}

def hr(color=AMBER, thickness=1):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6, spaceBefore=2)

def p(text, style="body"):
    return Paragraph(text, S[style])

def h1(text): return p(text, "h1")
def h2(text): return p(text, "h2")
def h3(text): return p(text, "h3")
def sp(h=4):  return Spacer(1, h)

def badge_row(sev, ref, summary):
    sev_style = {"CRITICAL": "tag_crit", "HIGH": "tag_high", "MEDIUM": "tag_med", "PASS": "tag_pass"}.get(sev, "tag_med")
    data = [[Paragraph(sev, S[sev_style]),
             Paragraph(f"<b>{ref}</b>", S["h3"]),
             Paragraph(summary, S["body"])]]
    t = Table(data, colWidths=[18*mm, 28*mm, PAGE_W - MARGIN*2 - 50*mm])
    t.setStyle(TableStyle([
        ("VALIGN",    (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0), (-1,-1), 3),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [LGREY]),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#CBD5E1")),
        ("ROUNDEDCORNERS", [3]),
    ]))
    return t

def summary_table(rows):
    header = [Paragraph(c, ParagraphStyle("th", fontSize=8, fontName="Helvetica-Bold",
                                           textColor=colors.white))
              for c in ["#", "Severity", "Flow", "Issue", "File / Line"]]
    data   = [header]
    for i, (sev, flow, issue, loc) in enumerate(rows, 1):
        sev_col = {"CRITICAL": RED, "HIGH": ORANGE, "MEDIUM": BLUE, "LOW": GREEN}.get(sev, BLUE)
        data.append([
            Paragraph(str(i), S["body"]),
            Paragraph(sev, ParagraphStyle("sev", fontSize=8, fontName="Helvetica-Bold",
                                          textColor=sev_col)),
            Paragraph(flow, S["body"]),
            Paragraph(issue, S["body"]),
            Paragraph(loc,   S["code"]),
        ])
    cw = [8*mm, 18*mm, 22*mm, PAGE_W-MARGIN*2-80*mm, 32*mm]
    t  = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), BRAND),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LGREY]),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("GRID",         (0,0), (-1,-1), 0.25, colors.HexColor("#CBD5E1")),
        ("LEFTPADDING",  (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0), (-1,-1), 3),
    ]))
    return t

# ════════════════════════════════════════════════════════════════════════════
story = []

# ── Cover ────────────────────────────────────────────────────────────────────
story += [
    sp(30),
    p("FreightFlex", "cover_title"),
    p("Driver Mobile App", "cover_title"),
    p("End-to-End Test Report", "cover_sub"),
    sp(6),
    hr(AMBER, 2),
    sp(6),
    p(f"Report Date: {date.today().strftime('%d %B %Y')}", "cover_date"),
    p("Platform: React Native (iOS &amp; Android)", "cover_date"),
    p("Backend: FastAPI (Python)", "cover_date"),
    p("Environment: Local / VPS (No Azure Storage)", "cover_date"),
    sp(20),
]

# Severity legend
legend_data = [
    [Paragraph("CRITICAL", S["tag_crit"]), p("Blocks core user flow — app is unusable for that feature")],
    [Paragraph("HIGH",     S["tag_high"]), p("Data is wrong, lost, or security concern")],
    [Paragraph("MEDIUM",   S["tag_med"]), p("Degraded UX, wrong feedback, minor data issue")],
]
leg = Table(legend_data, colWidths=[22*mm, PAGE_W-MARGIN*2-26*mm])
leg.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),5),
    ("BOTTOMPADDING",(0,0),(-1,-1),4),
    ("TOPPADDING",(0,0),(-1,-1),4),
    ("ROWBACKGROUNDS",(0,0),(-1,-1),[LGREY]),
    ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#CBD5E1")),
]))
story += [h2("Severity Legend"), leg, sp(10)]

# ── Executive Summary ────────────────────────────────────────────────────────
story += [
    hr(), h1("1. Executive Summary"), hr(),
    p("This report covers a full end-to-end code audit of the FreightFlex Driver mobile "
      "application. Every screen, API call, and backend route used by drivers was reviewed. "
      "26 issues were identified spanning authentication, document upload, compliance/handover, "
      "availability scheduling, notifications, and general UX."),
    sp(4),
    p("<b>6 Critical issues</b> block core functionality — delivery proof photos are never "
      "uploaded (a mock URI is used), handover photos are captured but never sent to the server, "
      "the compliance photo endpoints have a complete request-format mismatch, push notifications "
      "are never registered, and availability changes are not persisted correctly."),
    sp(4),
]

counts_data = [
    [Paragraph("Severity", ParagraphStyle("th2", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white)),
     Paragraph("Count",    ParagraphStyle("th2", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white)),
     Paragraph("Flows affected", ParagraphStyle("th2", fontSize=9, fontName="Helvetica-Bold", textColor=colors.white))],
    [Paragraph("CRITICAL", ParagraphStyle("c1",fontSize=9,fontName="Helvetica-Bold",textColor=RED)),
     p("6"), p("Compliance, Availability, Notifications")],
    [Paragraph("HIGH",     ParagraphStyle("c2",fontSize=9,fontName="Helvetica-Bold",textColor=ORANGE)),
     p("9"), p("Compliance, Documents, Jobs, Auth, API Client")],
    [Paragraph("MEDIUM",   ParagraphStyle("c3",fontSize=9,fontName="Helvetica-Bold",textColor=BLUE)),
     p("11"), p("Auth, Navigation, Profile, Notifications, UX")],
]
ct = Table(counts_data, colWidths=[30*mm, 18*mm, PAGE_W-MARGIN*2-52*mm])
ct.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),BRAND),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LGREY]),
    ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#CBD5E1")),
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,0),(-1,-1),4),
    ("BOTTOMPADDING",(0,0),(-1,-1),4),
]))
story += [ct, sp(8)]

# ── Issue Master Table ───────────────────────────────────────────────────────
story += [hr(), h1("2. Issue Master List"), hr()]

master_rows = [
    ("CRITICAL","Compliance","Delivery photo uses hardcoded mock URI — real photo never uploaded","DeliveryScreen.tsx:61"),
    ("CRITICAL","Compliance","Handover photos captured but never sent to backend","DriverApp.tsx:1413"),
    ("CRITICAL","Compliance","Handover/Delivery photo upload endpoints expect JSON (presigned URLs) but mobile sends FormData","compliance_flat.py:154"),
    ("CRITICAL","Availability","Save creates duplicate slots instead of updating; toggle never persists","DriverApp.tsx:1614"),
    ("CRITICAL","Availability","PUT /availability/toggle requires slot_id path param; mobile sends body only → 404","supplier.py / driverApi.ts:92"),
    ("CRITICAL","Notifications","FCM token never registered → no push notifications on device","DriverApp.tsx (missing call)"),
    ("HIGH","Compliance","Driver signature hardcoded to string 'driver_signed' — not real capture","DriverApp.tsx:1423"),
    ("HIGH","Compliance","Haulier signature drawn on driver phone never sent to server (requires HAULIER role)","HandoverScreen.tsx:232"),
    ("HIGH","Documents","documentType values (aadhaar_card, pan_card) not in backend DocType enum → 422","DocumentUploadScreen.tsx:29"),
    ("HIGH","Documents","File MIME type hardcoded to image/jpeg regardless of actual file","DriverApp.tsx:1573"),
    ("HIGH","Documents","docType vs documentType field name mismatch in API response vs mobile type","supplier.py:29 / types/index.ts:160"),
    ("HIGH","Jobs","Quote field name: mobile sends quoteAmount, backend flat route may use price","DriverApp.tsx:1271 / driverApi.ts:307"),
    ("HIGH","Jobs","canApply allows drivers with no uploaded documents to submit quotes","JobDiscoveryScreen.tsx:41"),
    ("HIGH","Auth","Backend profile update field names: camelCase sent, backend may expect snake_case","DriverApp.tsx:1128"),
    ("HIGH","API","Error from Pydantic validation (JSON object) displayed as [object Object]","client.ts:166"),
    ("MEDIUM","Navigation","invoices.detail route renders nothing — empty case in renderCurrentView","DriverApp.tsx:694"),
    ("MEDIUM","Navigation","onSelectDrawerRoute handles only 4 route groups; earnings/documents/availability do nothing","DriverApp.tsx:1767"),
    ("MEDIUM","Navigation","compliance.loadcode vs compliance.loadCode case mismatch in normalizeComplianceStep","DriverApp.tsx:201"),
    ("MEDIUM","Auth","authInfo success messages never rendered in any UI element","DriverApp.tsx:296"),
    ("MEDIUM","Auth","defaultVerify.email hardcoded to john@example.com","DriverApp.tsx:109"),
    ("MEDIUM","Auth","Reset password validator overwrites same error key twice — only last error shown","ResetPasswordScreen.tsx:56"),
    ("MEDIUM","Auth","Button text nearly invisible on ForgotPassword/ResetPassword screens (amber on dark blue)","ForgotPasswordScreen.tsx:148"),
    ("MEDIUM","Profile","Document file picker allows video selection (mediaType:'mixed')","ProfileScreen.tsx:252"),
    ("MEDIUM","Profile","Expiry date format DD-MM-YYYY may fail backend parsing (expects ISO8601)","ProfileScreen.tsx:247"),
    ("MEDIUM","Notifications","Mark All Read button missing from NotificationsScreen UI","NotificationsScreen.tsx:195"),
    ("MEDIUM","Branding","Copyright shows 'FreightFlow Systems' instead of FreightFlex","LoginScreen.tsx:125"),
]
story += [summary_table(master_rows), sp(10)]

# ── Detailed findings ────────────────────────────────────────────────────────
story += [hr(), h1("3. Detailed Findings by Flow"), hr()]

# ─ 3.1 Auth ─────────────────────────────────────────────────────────────────
story += [h2("3.1  Authentication Flow"), sp(2)]
story += [
    p("Screens: LoginScreen → RegisterScreen → VerifyScreen → ProfileSetupScreen"),
    p("The auth flow is largely functional. Login, register, OTP verification, forgot password "
      "and reset password all make correct API calls. Issues are mostly UX and edge-case bugs."),
    sp(4),
    KeepTogether([
        badge_row("MEDIUM","AUTH-01","defaultVerify.email is hardcoded to 'john@example.com' (DriverApp.tsx:109). "
                  "Correct email is set after registration but if VerifyScreen is reached via another path, the placeholder is shown."),
        sp(2),
        badge_row("MEDIUM","AUTH-02","authInfo state is set on registration success, OTP resend, etc., but no UI element "
                  "ever reads or renders this variable. Users get no success confirmation text."),
        sp(2),
        badge_row("MEDIUM","AUTH-03","ResetPasswordScreen validate() (line 56) sets errs.password for both 'no uppercase' "
                  "and 'no digit' checks, so only the last check survives. If both rules fail, only 'no digit' is shown."),
        sp(2),
        badge_row("MEDIUM","AUTH-04","ForgotPasswordScreen and ResetPasswordScreen have a 'Send'/'Submit' button with "
                  "textColor=colors.accent (amber) on a dark blue (#1066B1) background — text is nearly invisible."),
        sp(2),
        badge_row("HIGH","AUTH-05","Profile setup calls PUT /profile/update with camelCase fields "
                  "{licenceNumber, vehicleType}. The backend UpdateProfileRequest Pydantic model must have matching "
                  "aliases; if it only accepts snake_case, these fields are silently dropped."),
    ]),
    sp(6),
]

# ─ 3.2 Documents ─────────────────────────────────────────────────────────────
story += [h2("3.2  Document Upload Flow"), sp(2)]
story += [
    p("The document upload now correctly POSTs multipart FormData to POST /supplier/documents/upload "
      "(fixed in this session). However several issues remain:"),
    sp(4),
    KeepTogether([
        badge_row("HIGH","DOC-01","DocumentUploadScreen defines aadhaar_card and pan_card as selectable document types "
                  "(lines 29-33). Neither exists in the backend DocType enum. Submitting either returns 422. "
                  "Valid types are: DRIVING_LICENCE, VEHICLE_REG, VEHICLE_INSURANCE, COMPANY_REG, FLEET_INSURANCE."),
        sp(2),
        badge_row("HIGH","DOC-02","In handleDocumentUpload (DriverApp.tsx:1573), file MIME type is always hardcoded to "
                  "'image/jpeg' regardless of whether the driver selected a PDF or PNG. "
                  "The backend uses content_type to determine file extension."),
        sp(2),
        badge_row("HIGH","DOC-03","Backend _doc_dict returns docType (camelCase), but the mobile DocumentSummary type "
                  "declares documentType. ProfileScreen recovers via d.documentType ?? d.docType but the canonical "
                  "type definition is wrong and will cause TypeScript issues."),
        sp(2),
        badge_row("MEDIUM","DOC-04","Document file picker uses mediaType:'mixed' (ProfileScreen.tsx:252), allowing "
                  "video selection. Videos sent as documents will produce corrupt or rejected files."),
        sp(2),
        badge_row("MEDIUM","DOC-05","Expiry date is formatted as DD-MM-YYYY (ProfileScreen.tsx:247). The backend stores "
                  "it as a plain string (no parsing currently), but if date parsing is added later this will break. "
                  "Recommend ISO8601 (YYYY-MM-DD)."),
    ]),
    sp(2),
    p("No file-size validation exists anywhere in the upload flow. A driver can select a 100 MB "
      "file which will time out or exhaust server memory.", "bullet"),
    sp(6),
]

# ─ 3.3 Compliance ─────────────────────────────────────────────────────────────
story += [h2("3.3  Compliance Flow (Handover → Delivery)"), sp(2)]
story += [
    p("This is the most severely broken flow. Two of the six critical issues are here. "
      "The compliance pipeline — load code verify → handover checklist + photos + signature → "
      "delivery proof — is partially non-functional."),
    sp(4),
    KeepTogether([
        badge_row("CRITICAL","COM-01",
                  "DeliveryScreen.handlePickPhoto (line 61) does NOT launch the camera or image library. "
                  "It sets a hardcoded mock object {uri: 'mock-uri', type}. The delivery photo URL submitted "
                  "to POST /compliance/delivery/submit is always the string 'mock-uri' — never a real image."),
        sp(2),
        badge_row("CRITICAL","COM-02",
                  "handleSubmitHandover (DriverApp.tsx:1413) receives handover photos from HandoverScreen as the "
                  "second parameter but completely ignores them. submitHandoverPhotos is never called. "
                  "Photos captured on device are discarded."),
        sp(2),
        badge_row("CRITICAL","COM-03",
                  "POST /compliance/handover/photos/upload (compliance_flat.py:154) expects a JSON body "
                  "{jobId, count} and returns presigned Azure upload URLs. The mobile driverApi sends a FormData "
                  "object with actual photo bytes. These are completely incompatible — the endpoint cannot accept "
                  "the mobile's payload and would return 422."),
        sp(2),
        badge_row("HIGH","COM-04",
                  "signDriverHandover sends signatureData: 'driver_signed' (DriverApp.tsx:1423) — a hardcoded "
                  "string literal, not a real captured signature. No signature canvas or pad is shown to the driver. "
                  "The compliance record permanently stores this placeholder."),
        sp(2),
        badge_row("HIGH","COM-05",
                  "HandoverScreen captures a haulier signature locally via a drawing pad. This is stored in local "
                  "state only. POST /compliance/handover/sign/haulier requires HAULIER role — a driver cannot call "
                  "it. The haulier's drawn signature on the driver's phone is never persisted to the server."),
        sp(2),
        badge_row("MEDIUM","COM-06",
                  "normalizeComplianceStep (DriverApp.tsx:201) compares against 'compliance.loadcode' (all lowercase) "
                  "but the route key is 'compliance.loadCode' (camelCase C). The comparison always fails, "
                  "falling through to secondary status checks."),
        sp(2),
        badge_row("HIGH","COM-07",
                  "LoadCodeScreen has two duplicate buttons that both call onOpenScanner — one is a "
                  "'Can't find code? Open scanner' secondary button and one is an 'Open Scanner' primary button. "
                  "The duplication is confusing UX."),
    ]),
    sp(6),
]

# ─ 3.4 Jobs ─────────────────────────────────────────────────────────────────
story += [h2("3.4  Jobs & Quotes Flow"), sp(2)]
story += [
    KeepTogether([
        badge_row("HIGH","JOB-01",
                  "Quote submission (DriverApp.tsx:1271) sends {jobId, quoteAmount, currency, notes}. "
                  "The driverApi posts to POST /quotes/submit. If the backend flat endpoint expects the field "
                  "name 'price' (as used internally in quotes_svc.submit_quote), the amount is silently ignored "
                  "and stored as null."),
        sp(2),
        badge_row("HIGH","JOB-02",
                  "canApply check (JobDiscoveryScreen.tsx:41): canApply = docStatus === 'approved' || "
                  "docStatus === 'none'. Drivers with no uploaded documents (status 'none') are permitted to "
                  "apply for jobs. They should be blocked until at least DRIVING_LICENCE is submitted."),
        sp(2),
        badge_row("MEDIUM","JOB-03",
                  "Quote currency is hardcoded to 'INR' in both defaultQuoteForm and handleQuoteSubmit. "
                  "International drivers have no way to change the currency."),
        sp(2),
        badge_row("MEDIUM","JOB-04",
                  "GET /jobs/list?status=open is used for job discovery instead of GET /jobs/available. "
                  "The list endpoint returns all jobs visible to the role; the available endpoint is "
                  "specifically filtered for drivers. Drivers may see jobs they cannot bid on."),
    ]),
    sp(6),
]

# ─ 3.5 Availability ─────────────────────────────────────────────────────────
story += [h2("3.5  Availability Flow"), sp(2)]
story += [
    KeepTogether([
        badge_row("CRITICAL","AVL-01",
                  "handleAvailabilitySave (DriverApp.tsx:1614) calls POST /supplier/availability/set once per "
                  "selected day. On repeated saves this creates duplicate slots — each save adds N new rows "
                  "instead of updating existing ones. The correct approach is PUT /availability/update/{slot_id}."),
        sp(2),
        badge_row("CRITICAL","AVL-02",
                  "PUT /supplier/availability/toggle/{slot_id} requires slot_id as a URL path parameter. "
                  "driverApi.availability.toggle calls PUT /supplier/availability/toggle with a JSON body and "
                  "no path param — the server receives a request with a literal path '/toggle' which matches "
                  "no route → 404/405."),
        sp(2),
        badge_row("MEDIUM","AVL-03",
                  "GET /supplier/availability/me returns {slots, blocks}. The mobile reads avail.isAvailable "
                  "and avail.availableDays (DriverApp.tsx:650) — fields that don't exist in the response. "
                  "isAvailable is always undefined; the UI falls back to blocks.length === 0."),
        sp(2),
        badge_row("MEDIUM","AVL-04",
                  "Time inputs in AvailabilityScreen are plain TextInput fields with no time picker or "
                  "validation. A driver can submit '99:99' as a start time, which will be stored and "
                  "cause issues in any downstream scheduling logic."),
    ]),
    sp(6),
]

# ─ 3.6 Notifications ────────────────────────────────────────────────────────
story += [h2("3.6  Notifications"), sp(2)]
story += [
    KeepTogether([
        badge_row("CRITICAL","NOT-01",
                  "FCM token registration (driverApi.notifications.registerFcmToken) is defined in driverApi.ts "
                  "but is never called anywhere in DriverApp.tsx. The device token is never sent to the backend, "
                  "so the server cannot send push notifications to the driver's device."),
        sp(2),
        badge_row("MEDIUM","NOT-02",
                  "WebSocket notification handler reads payload.body as the message body (DriverApp.tsx:928) "
                  "but the REST notification list returns item.message. The field names are inconsistent — "
                  "live push notifications may display blank message bodies."),
        sp(2),
        badge_row("MEDIUM","NOT-03",
                  "NotificationsScreen has no 'Mark All Read' button despite the onMarkAllRead handler being "
                  "passed as a prop from DriverApp. The feature is implemented in the backend and the handler "
                  "exists but is unreachable from the UI."),
    ]),
    sp(6),
]

# ─ 3.7 Navigation & General ──────────────────────────────────────────────────
story += [h2("3.7  Navigation & General UX"), sp(2)]
story += [
    KeepTogether([
        badge_row("MEDIUM","NAV-01",
                  "invoices.detail route (DriverApp.tsx:694-695) is an empty case — no screen is rendered. "
                  "Tapping an invoice to view its details shows nothing."),
        sp(2),
        badge_row("MEDIUM","NAV-02",
                  "onSelectDrawerRoute only handles home, jobs.*, tracking/compliance.*, and profile.* route "
                  "groups. Tapping earnings, documents, availability, notifications, or support in the drawer "
                  "does nothing — the route is not mapped."),
        sp(2),
        badge_row("MEDIUM","NAV-03",
                  "earnings.monthly and earnings.total both load the same data and render the same screen. "
                  "There is no distinct 'total earnings' view."),
        sp(2),
        badge_row("MEDIUM","BRD-01",
                  "LoginScreen.tsx:125 copyright text reads 'FreightFlow Systems' — incorrect brand name. "
                  "Should be 'FreightFlex'."),
    ]),
    sp(6),
]

# ─ 3.8 API Client ────────────────────────────────────────────────────────────
story += [h2("3.8  API Client (mobile/src/api/client.ts)"), sp(2)]
story += [
    KeepTogether([
        badge_row("HIGH","API-01",
                  "When a backend Pydantic validation error returns a JSON array as the 'message' field, "
                  "JavaScript displays it as '[object Object]'. The client should detect array/object "
                  "messages and format them into a readable string."),
        sp(2),
        badge_row("MEDIUM","API-02",
                  "Token refresh regex (/not authenticated|unauthorized|invalid or expired token/) "
                  "is too narrow. Backend messages like 'Token has expired' or 'Authentication required' "
                  "won't trigger a refresh — the user gets a raw 401 error instead."),
        sp(2),
        badge_row("MEDIUM","API-03",
                  "No network connectivity check before requests. On airplane mode, the driver waits "
                  "the full 60-second AbortController timeout before seeing an error."),
    ]),
    sp(6),
]

# ── Recommended Fixes ─────────────────────────────────────────────────────────
story += [hr(), h1("4. Recommended Fixes (Priority Order)"), hr()]

fixes = [
    ("1", "CRITICAL", "Fix DeliveryScreen.handlePickPhoto",
     "Replace mock object with launchCamera() / launchImageLibrary() call. Upload result to "
     "POST /files/upload or a dedicated compliance endpoint before calling submitDeliveryProof."),
    ("2", "CRITICAL", "Fix compliance photo upload contract",
     "Convert POST /compliance/handover/photos/upload and /delivery/photos/upload to accept "
     "multipart FormData (UploadFile) directly, similar to the supplier documents fix. "
     "Remove the presigned-URL two-step for mobile clients."),
    ("3", "CRITICAL", "Wire up handover photo upload",
     "In handleSubmitHandover, iterate the photos parameter and call driverApi.compliance."
     "submitHandoverPhotos with the actual file FormData before signing."),
    ("4", "CRITICAL", "Register FCM token on login",
     "After login succeeds, call driverApi.notifications.registerFcmToken(deviceToken) "
     "using the token obtained from @react-native-firebase/messaging."),
    ("5", "CRITICAL", "Fix availability save — update not create",
     "Fetch existing slots first. For each selected day, if a slot already exists call "
     "PUT /supplier/availability/update/{slot_id}; otherwise POST /availability/set."),
    ("6", "CRITICAL", "Fix availability toggle API call",
     "driverApi.availability.toggle must include slot_id as a path parameter: "
     "PUT /supplier/availability/toggle/{slotId}."),
    ("7", "HIGH", "Add real driver signature capture",
     "Integrate a signature canvas (e.g. react-native-signature-canvas). Upload the "
     "captured SVG/PNG to /files/upload and send the returned URL as signatureData."),
    ("8", "HIGH", "Remove aadhaar_card and pan_card from DocumentUploadScreen",
     "These types are not in the backend DocType enum. Replace with the valid types: "
     "DRIVING_LICENCE, VEHICLE_REG, VEHICLE_INSURANCE."),
    ("9", "HIGH", "Fix file MIME type in document upload",
     "Use file.type from the picked asset instead of hardcoding 'image/jpeg'. "
     "Also restrict mediaType to 'photo' or add 'pdf' support explicitly."),
    ("10", "HIGH", "Prevent unverified drivers from submitting quotes",
     "Change canApply: docStatus === 'approved' — remove the '|| docStatus === none' clause."),
    ("11", "MEDIUM", "Add 'Mark All Read' button to NotificationsScreen","Add a header-right button that calls onMarkAllRead prop."),
    ("12", "MEDIUM", "Fix invoices.detail empty route","Implement and render an InvoiceDetailScreen for the invoices.detail route."),
    ("13", "MEDIUM", "Map all drawer routes in onSelectDrawerRoute","Handle earnings.*, documents.*, availability.*, notifications.*, support.* route groups."),
    ("14", "MEDIUM", "Fix LoginScreen copyright text","Change 'FreightFlow Systems' to 'FreightFlex'."),
    ("15", "MEDIUM", "Fix invisible button text on ForgotPassword/Reset screens","Use colors.white or a high-contrast color on the dark blue background."),
]

fix_data = [[Paragraph(c, ParagraphStyle("th3", fontSize=8, fontName="Helvetica-Bold", textColor=colors.white))
             for c in ["#", "Priority", "Title", "Action"]]]
for num, pri, title, action in fixes:
    pc = {"CRITICAL": RED, "HIGH": ORANGE, "MEDIUM": BLUE}.get(pri, BLUE)
    fix_data.append([
        Paragraph(num, S["body"]),
        Paragraph(pri, ParagraphStyle("fp", fontSize=8, fontName="Helvetica-Bold", textColor=pc)),
        Paragraph(title, S["h3"]),
        Paragraph(action, S["body"]),
    ])

ft = Table(fix_data, colWidths=[8*mm, 18*mm, 45*mm, PAGE_W-MARGIN*2-75*mm], repeatRows=1)
ft.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),BRAND),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, LGREY]),
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#CBD5E1")),
    ("LEFTPADDING",(0,0),(-1,-1),5),
    ("RIGHTPADDING",(0,0),(-1,-1),5),
    ("TOPPADDING",(0,0),(-1,-1),4),
    ("BOTTOMPADDING",(0,0),(-1,-1),4),
]))
story += [ft, sp(10)]

# ── Test Checklist ────────────────────────────────────────────────────────────
story += [hr(), h1("5. Manual Test Checklist"), hr(),
          p("Use this checklist when manually testing on a device after fixes are applied.")]

checklist_sections = [
    ("Authentication", [
        "Register with valid name/email/phone/password (min 8 chars, uppercase, digit)",
        "Check OTP email received; enter correct OTP → lands on ProfileSetup",
        "Enter wrong OTP → see clear error message",
        "Request OTP resend → receive new email; old OTP rejected",
        "Login with wrong password → see 'Invalid credentials' (no page reload)",
        "Login with correct password → lands on Dashboard (or ProfileSetup if incomplete)",
        "Forgot password → receive OTP email → reset with new password → login succeeds",
        "Change password from Settings → old password required, new password confirmed",
        "Logout → session cleared, redirected to Login",
    ]),
    ("Profile", [
        "Upload profile photo → photo appears immediately in header",
        "Upload profile photo a second time → replaces previous (no 500 error)",
        "Update name, phone, vehicle type → changes persist after refresh",
        "View documents list → correct statuses shown (PENDING / APPROVED / REJECTED)",
        "Upload DRIVING_LICENCE document → appears in list with PENDING status",
        "Upload VEHICLE_REG document → appears in list",
        "Upload VEHICLE_INSURANCE document → appears in list",
        "Re-upload same document type → replaces previous (no uniqueness error)",
    ]),
    ("Jobs & Quotes", [
        "Browse available jobs → list loads with correct details",
        "View job detail → pickup, delivery, weight, price visible",
        "Submit quote with amount → quote appears in My Quotes with PENDING status",
        "Withdraw a pending quote → quote removed from list",
        "Driver with no documents cannot submit quote (blocked by UI)",
    ]),
    ("Compliance — Handover", [
        "Verify load code → correct code accepted, wrong code rejected with error",
        "Complete vehicle checklist → all items tappable",
        "Capture handover photos → photos visible in preview",
        "Handover photos uploaded to server (verify via admin panel or DB)",
        "Driver signs handover → real signature captured (not placeholder string)",
        "Haulier countersigns → system records both signatures",
        "Proceed to active tracking after both signatures",
    ]),
    ("Compliance — Delivery", [
        "Capture delivery photo using camera → real photo visible in preview",
        "Delivery photo URL is a real server URL (not 'mock-uri')",
        "Enter recipient name → required field validated",
        "Capture recipient signature → drawn signature recorded",
        "Submit delivery → POST /compliance/delivery/submit succeeds",
        "Payment released screen appears after successful submission",
    ]),
    ("Availability", [
        "Set availability for Monday 08:00–17:00 → slot created in DB",
        "Save again for same day → existing slot updated, no duplicate created",
        "Toggle a day off → change persists after app restart",
        "Block dates work correctly — blocked range appears in list",
    ]),
    ("Notifications", [
        "Push notification received on device when haulier accepts quote",
        "Tapping push notification opens correct screen",
        "In-app notification badge shows unread count",
        "Marking one notification read → count decrements",
        "Mark All Read → all notifications cleared",
        "Live WebSocket notification arrives without app restart",
    ]),
    ("General / Edge Cases", [
        "No network → clear error shown within a few seconds (not 60s hang)",
        "Slow network → upload shows loading state throughout",
        "Session expires mid-session → auto-refreshes transparently",
        "All drawer menu items navigate to correct screens",
        "Invoice detail screen renders invoice data",
        "Earnings monthly and total show different data",
    ]),
]

for section, items in checklist_sections:
    story += [h3(f"✦  {section}")]
    for item in items:
        story += [p(f"☐  {item}", "bullet")]
    story += [sp(4)]

# ── Footer note ──────────────────────────────────────────────────────────────
story += [
    hr(DGREY, 0.5),
    p("Generated by Claude Code automated E2E audit · FreightFlex · " + date.today().strftime("%d %B %Y"),
      "cover_date"),
]

doc.build(story)
print(f"PDF written to: {OUTPUT}")
