# BillQuest

## Project Overview
Personal bill tracking app to answer one question: "What bills are due before next Friday (payday)?"

## Origin
Born from Brent's project paralysis recovery session - started with "I want to see all my bills in one place" and narrowed down to the real problem: surfacing bill info at the right time (payday).

## Core Concept
- Brent gets paid every Friday
- Bills have due dates (day of month)
- MVP view: "Here's what's due between now and next Friday"

## MVP Features
- Bill entry (name, amount, due day of month)
- Single view: bills due before next payday
- Single user (Brent only for now, Myla may join later)

## Tech Stack
Same as ThriveQuest:
- SvelteKit
- Cloudflare Pages
- D1 Database
- Tailwind CSS

## Future Considerations (NOT MVP)
- Multi-user / auth
- Myla's pay schedule (1st and 15th)
- Bill assignment per paycheck
- Push notifications
- Payment tracking / "mark as paid"
- Recurring bill auto-generation

## Development Notes
- Keep it simple - resist feature creep
- This exists because a spreadsheet wasn't getting opened
- The value is in surfacing, not storing
