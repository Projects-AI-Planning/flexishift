"""Public, unauthenticated legal/compliance pages (e.g. the Google Play
account-deletion request page). These must return HTTP 200 for anyone — no
auth, no rate-limit gating — because Google's reviewers and end users open them
directly from the Play Store listing."""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["legal"])

SUPPORT_EMAIL = "support@flexishift.com"
PRIVACY_EMAIL = "privacy@flexishift.com"

_ACCOUNT_DELETION_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<title>Delete Your FlexiShift Account &amp; Data</title>
<style>
  :root {{ --blue:#1f6feb; --ink:#1a1d21; --muted:#5b636b; --line:#e4e7eb; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
          color:var(--ink); background:#f6f8fa; line-height:1.6; }}
  .wrap {{ max-width:760px; margin:0 auto; padding:32px 20px 64px; }}
  header {{ display:flex; align-items:center; gap:12px; margin-bottom:8px; }}
  header .logo {{ font-size:28px; }}
  h1 {{ font-size:26px; margin:18px 0 6px; }}
  h2 {{ font-size:19px; margin:32px 0 10px; }}
  .lead {{ color:var(--muted); font-size:15px; }}
  .card {{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:22px 24px; margin-top:18px; }}
  ol {{ padding-left:20px; }}
  ol li {{ margin:10px 0; }}
  table {{ width:100%; border-collapse:collapse; margin-top:8px; font-size:14px; }}
  th,td {{ text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }}
  th {{ background:#f0f4f9; font-weight:600; }}
  a {{ color:var(--blue); }}
  .pill {{ display:inline-block; background:#eef4ff; color:var(--blue); border-radius:999px;
           padding:2px 10px; font-size:12px; font-weight:600; }}
  footer {{ margin-top:36px; color:var(--muted); font-size:13px; border-top:1px solid var(--line); padding-top:16px; }}
  .email {{ font-weight:600; }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <span class="logo">🚚</span>
    <span class="pill">FlexiShift</span>
  </header>

  <h1>Request Deletion of Your FlexiShift Account &amp; Data</h1>
  <p class="lead">
    This page explains how to request deletion of your <strong>FlexiShift</strong> account
    (the FlexiShift mobile app, published by FlexiShift) and the personal data associated with it.
  </p>

  <div class="card">
    <h2 style="margin-top:0">Option 1 — Delete from within the app</h2>
    <ol>
      <li>Open the <strong>FlexiShift</strong> app and sign in to your account.</li>
      <li>Go to the <strong>Profile</strong> tab, then tap <strong>Settings</strong>.</li>
      <li>Scroll to <strong>Danger Zone</strong> and tap <strong>Delete Account</strong>.</li>
      <li>Confirm twice when prompted.</li>
      <li>Your account and personal data are deleted immediately and you are signed out. This cannot be undone.</li>
    </ol>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Option 2 — Request deletion by email</h2>
    <p>If you can no longer sign in, email us from the address registered to your account:</p>
    <ol>
      <li>Send an email to <a class="email" href="mailto:{SUPPORT_EMAIL}?subject=Account%20Deletion%20Request">{SUPPORT_EMAIL}</a>.</li>
      <li>Use the subject line <strong>&ldquo;Account Deletion Request&rdquo;</strong>.</li>
      <li>Include the full name and email/phone number on your FlexiShift account so we can verify your identity.</li>
      <li>We will confirm and complete your request within <strong>30 days</strong>.</li>
    </ol>
  </div>

  <h2>What data is deleted, and what is kept</h2>
  <div class="card">
    <table>
      <thead>
        <tr><th>Data</th><th>What happens</th><th>Retention</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Profile data (name, email, phone, profile photo, e-signature, address, vehicle details)</td>
          <td>Deleted / anonymised</td>
          <td>Removed within 30 days of the request</td>
        </tr>
        <tr>
          <td>Uploaded documents &amp; compliance files (licences, insurance, certificates)</td>
          <td>Deleted</td>
          <td>Removed within 30 days of the request</td>
        </tr>
        <tr>
          <td>Login credentials &amp; access</td>
          <td>Disabled immediately, then deleted</td>
          <td>Account is suspended at once; credentials removed within 30 days</td>
        </tr>
        <tr>
          <td>Transaction, booking, invoice &amp; payment records</td>
          <td>Kept (legal / financial obligation), then deleted</td>
          <td>Retained for up to 7 years to meet tax and accounting law, then permanently deleted</td>
        </tr>
        <tr>
          <td>Records we are legally required to keep (e.g. fraud, dispute or safety records)</td>
          <td>Kept only as required by law</td>
          <td>Deleted once the legal retention period ends</td>
        </tr>
      </tbody>
    </table>
    <p class="lead" style="margin-top:14px">
      After deletion, your email address is released so you can register a new FlexiShift account
      with it in the future.
    </p>
  </div>

  <footer>
    Need help? Contact us at
    <a href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a>.<br>
    &copy; FlexiShift. All rights reserved.
  </footer>
</div>
</body>
</html>"""


@router.get("/account-deletion", response_class=HTMLResponse, include_in_schema=False)
@router.get("/delete-account", response_class=HTMLResponse, include_in_schema=False)
def account_deletion_page() -> HTMLResponse:
    return HTMLResponse(content=_ACCOUNT_DELETION_HTML)
