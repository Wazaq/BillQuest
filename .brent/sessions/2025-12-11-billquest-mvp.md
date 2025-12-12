# BillQuest MVP Session - December 11, 2025

## Session Summary
Built BillQuest from scratch in one evening session. Went from empty project folder to fully deployed, functional bill tracking app.

## What We Built

### Core Features
- **Bill entry**: Name, amount, due date, frequency (monthly/annual/every N months)
- **"Due before Friday" view**: Shows bills due before next payday with total
- **Mark as paid**: Removes bill from due list until next cycle
- **Overdue tracking**: If you miss a cycle after marking paid, shows overdue count and multiplied amount
- **Inline edit/delete**: Modify bills directly in the list
- **Collapsible add form**: Cleaner mobile experience

### Tech Stack
- SvelteKit (Svelte 5 with runes)
- Cloudflare Pages
- D1 Database
- Tailwind CSS v4

### Deployment
- Live at: https://billquest.pages.dev/
- GitHub: https://github.com/Wazaq/BillQuest
- Single branch (dev as prod) - solo project, no ceremony needed

## Key Decisions

1. **Server-side time (UTC)**: Using Cloudflare edge time, not local timezone. Means "next Friday" might be off by a day at night. Left as-is - forces checking Thursday night anyway.

2. **Overdue logic**: Bills without `paid_through` are NOT retroactively overdue from 1970. Overdue tracking only kicks in after you mark something paid and then miss a future cycle.

3. **Anchor date over due_day**: Switched from simple day-of-month to full anchor dates to support annual and every-N-months billing properly.

## Bugs Squashed

1. **$4.1 million debt bug**: Overdue calculation was going back to 1970 (672 months * bill amounts). Fixed by only tracking overdue after first payment.

2. **Form submission cancelled**: Edit form was removing itself from DOM before POST completed. Fixed with `use:enhance` to sequence properly.

## Data Entered
- 16 monthly debt bills
- 13 monthly subscriptions
- 10 annual subscriptions
- 1 every-2-months (car insurance)
- Total: 40+ bills tracked

## Future Ideas (Not MVP)
- Multi-user / auth (Myla's pay schedule)
- Bill assignment per paycheck
- Push notifications
- Every-N-weeks frequency (Chewy autoship is 5 weeks)
- Local timezone support
- Payment history tracking

## Session Stats
- Duration: ~3 hours
- Commits: 7
- Files: Core app is ~500 lines across 3 files
- Result: Actually useful app Brent will check on his phone

## Memorable Moment
The screenshot of $4,107,014.00 due by Friday - including "Catholic Cemetery (Chi Mom's Grave) OVERDUE (671)" at $40,260.00. Committed to `.brent/bad_brent_billquest.png` as a monument to the bug.
