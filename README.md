# ScholarDesk

**Your unified academic command center** — built for Dr. Hari Prakash, Assistant Professor in Public Health.

ScholarDesk brings research project management, publication tracking, teaching planning, exam scheduling, question paper preparation, team coordination, and reminders into one beautiful, fluid web application.

![ScholarDesk](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![SQLite](https://img.shields.io/badge/SQLite-Prisma-green)

## Features

### Research Projects
- Track multiple research ideas and active studies
- Assign tasks to students and colleagues
- Monitor project status, priority, and timelines
- Auto-create reminders when assigning tasks

### Publication Tracker
- Full manuscript lifecycle: Draft → Submitted → Under Review → Revision → Accepted/Rejected → Published
- Store reviewer comments, manuscript IDs, and DOIs
- Filter by publication status

### Teaching Planner
- Manage courses with semester, credits, and descriptions
- Weekly class timetable with room and topic tracking
- Visual day-by-day schedule

### Exams & Marks
- Schedule exams with date, venue, duration, and syllabus
- Track exam status (Planned → QP Ready → Conducted → Grading → Completed)
- Marks entry checkbox
- Automatic exam reminders

### Question Papers
- Link question papers to courses and exams
- Track preparation status and due dates
- Section breakdown and notes

### People & Collaborators
- Manage students, colleagues, co-investigators
- Contact info for reminder targeting
- Role-based filtering

### Reminders
- Unified reminder center for all modules
- Overdue alerts on dashboard
- Assign reminders to specific people
- Mark complete with one click

### Dashboard
- At-a-glance stats and charts
- Publication pipeline visualization
- Task overview
- Upcoming exams and reminders

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** SQLite with Prisma ORM
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Charts:** Recharts
- **UI:** Custom components with Radix UI primitives

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # All main pages
│   │   ├── page.tsx          # Dashboard
│   │   ├── research/         # Research projects
│   │   ├── publications/     # Publication tracker
│   │   ├── teaching/         # Course management
│   │   ├── timetable/        # Class schedule
│   │   ├── exams/            # Exams & marks
│   │   ├── question-papers/  # QP preparation
│   │   ├── people/           # Collaborators
│   │   └── reminders/        # Reminder center
│   └── api/                  # REST API routes
├── components/
│   ├── layout/               # Sidebar navigation
│   └── ui/                   # Reusable UI components
├── lib/                      # Utils, hooks, constants
└── generated/prisma/         # Prisma client
```

## Database Commands

```bash
npm run db:migrate    # Apply schema changes
npm run db:seed       # Load sample data
npm run db:reset      # Reset and re-seed database
```

## Customization

Your profile is stored in the database (`AppSettings` table). The app is pre-configured for **Dr. Hari Prakash** with sample public health research data.

To reset with fresh sample data:
```bash
npm run db:reset
```

## Future Enhancements

- Email notifications for reminders (SMTP integration)
- Export reports (PDF/Excel)
- Calendar sync (Google Calendar)
- File attachments for manuscripts
- Student marks spreadsheet import

---

Built with care for academic life. *Research smarter, teach better.*
