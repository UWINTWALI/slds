# SLDS Reporting & Notifications

## What changed

Reports are now **submitted on the platform** (not only printed in the browser). Recipients get **in-app notifications** with sender details and can **view, read, and download** the document.

### Report flow

| Role | Action | Notifies |
|------|--------|----------|
| **Sector officer** | Submit sector report | District officer(s) in that district |
| **District officer** | Submit district report | National admin(s) |
| **National admin** | Publish underserved sectors | District officers + sector officers in listed areas |

### UI

- **Reports Inbox** — sidebar → view received/sent reports
- **Notification bell** — header (unread count + quick links)
- **Submit** buttons on Sector Planner, District Planner, Ministry dashboard
- **Preview PDF** — still opens print dialog (no notification)

## Database setup

Tables are created automatically on API startup (`create_all`). For manual migration:

```bash
psql -U slds_user -d slds_db -f backend/schema_reports.sql
```

## API (authenticated)

- `POST /api/reports` — submit report
- `GET /api/reports?box=inbox|sent` — list reports
- `GET /api/reports/{id}` — report metadata
- `GET /api/reports/{id}/view` — full HTML document
- `POST /api/reports/{id}/read` — mark read
- `GET /api/notifications` — list notifications
- `GET /api/notifications/unread-count` — badge count
- `POST /api/notifications/{id}/read` — dismiss notification

## Run

```bash
# Terminal 1 — backend
cd backend
uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Log in as different demo users (sector → district → national) to test the full chain.
