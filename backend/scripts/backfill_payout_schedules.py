"""One-time backfill: switch existing Connect accounts to automatic daily payouts.

Accounts created before the create_connect_account() fix were given
settings.payouts.schedule.interval = "manual", so driver funds accumulated in the
connected account balance and never reached their bank (nothing in this codebase
creates Stripe Payouts). This walks every connected account and flips the ones
still on "manual" to daily/minimum-delay.

Safe to re-run: accounts already on "daily" are skipped.

    python scripts/backfill_payout_schedules.py --dry-run   # report only
    python scripts/backfill_payout_schedules.py             # apply
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stripe

from app.config import settings

TARGET_SCHEDULE = {"interval": "daily", "delay_days": "minimum"}


def _current_interval(account) -> str | None:
    # StripeObject exposes nested data as attributes, not via dict .get().
    acct_settings = getattr(account, "settings", None)
    payouts = getattr(acct_settings, "payouts", None)
    schedule = getattr(payouts, "schedule", None)
    return getattr(schedule, "interval", None)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would change without calling the Account Update API",
    )
    args = parser.parse_args()

    if not settings.STRIPE_SECRET_KEY:
        print("STRIPE_SECRET_KEY is not set — aborting.")
        sys.exit(1)

    stripe.api_key = settings.STRIPE_SECRET_KEY

    mode = "DRY RUN — no changes will be made" if args.dry_run else "APPLYING CHANGES"
    print(f"Backfilling Connect payout schedules to daily/minimum. {mode}.\n")

    scanned = updated = skipped = failed = 0

    # auto_paging_iter() handles pagination, so platforms with more than one page
    # of connected accounts are fully covered.
    for account in stripe.Account.list(limit=100).auto_paging_iter():
        scanned += 1
        account_id = account["id"]
        interval = _current_interval(account)

        if interval == "daily":
            skipped += 1
            continue

        if args.dry_run:
            print(f"  would update {account_id} (interval={interval!r})")
            updated += 1
            continue

        try:
            stripe.Account.modify(account_id, settings={"payouts": {"schedule": TARGET_SCHEDULE}})
        except stripe.StripeError as exc:
            # Restricted or rejected accounts can refuse schedule changes. Keep going —
            # one bad account must not abort the whole backfill.
            failed += 1
            msg = getattr(exc, "user_message", None) or str(exc)
            print(f"  FAILED {account_id} (interval={interval!r}): {msg}")
            continue

        updated += 1
        print(f"  updated {account_id} (was interval={interval!r})")

    verb = "would update" if args.dry_run else "updated"
    print(
        f"\nDone. scanned={scanned} {verb}={updated} "
        f"already-daily={skipped} failed={failed}"
    )


if __name__ == "__main__":
    main()
