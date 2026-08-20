# Mission Property Tracker

Small internal Express/EJS app for tracking mission property caretaker tasks, clock sessions, visits, competencies, private admin notes, and pay ledger records.

## Setup

1. Copy `.env.example` to `.env`.
2. Set the MySQL connection values and replace `SESSION_SECRET`.
3. Set the seeded admin and worker credentials.
4. Run:

```bash
npm install
npm run setup
npm start
```

The app defaults to `http://localhost:3000`.

## Seeded Roles

- `admin`: full access to tasks, calendar edits, visit approvals, competencies, private work-ethic notes, domains, and pay ledger.
- `worker`: can clock in/out, move their own task statuses, mark tasks done, log visits, and view their own competency/pay records.

## Notes

- This app is mission-property-only. It intentionally does not include church property, church tasks, or church finances.
- `competency_scores` is append-only; the current score is the newest row per worker/domain.
- `work_ethic_notes` is only written and accessed through admin-protected routes.
- `pay_ledger` is record keeping only. No payment processing is implemented.
