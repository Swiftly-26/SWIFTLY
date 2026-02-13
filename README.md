# SWIFTLY

SWIFTLY is a modern internal operations management tool built with Angular and Node.js. It helps teams manage work requests, track assignments, and monitor progress through role-based access control.

![GitLens Explorer](https://raw.githubusercontent.com/Qamza25/github-explorer/main/imgs/home page.PNG)
---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Business Rules](#business-rules)
- [Design Principles Applied](#design-principles-applied)
- [Mock Data](#mock-data)
- [Responsive Design](#responsive-design)
- [Color Scheme](#color-scheme)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Functionality

- **Dashboard** - Overview of all requests with statistics and status distribution
- **Request Management** - Create, view, edit, and delete work requests
- **Agent Management** - Add and remove agents (Admin only)
- **Comment System** - Add and edit comments on requests
- **Role-Based Access** - Admin and Agent roles with different permissions

### Request Attributes

Each request includes the following fields:

- Title and Description
- Priority: Low / Medium / High / Critical
- Status: Open / In Progress / Blocked / Done
- Created Date and Due Date
- Assigned Agent (optional)
- Tags (e.g., "IT", "Finance", "Urgent", "HR")

### Smart Features

- **Search and Filter** - Search by title, description, and tags
- **Filter by** - Status, Priority, Assigned agent, Overdue requests
- **Sort by** - Last updated, Priority, Due date
- **Status Transitions** - Enforced workflow rules
- **Overdue Logic** - Automatic flagging of overdue requests
- **Priority Escalation** - Auto-escalation to Critical after 3 days overdue
- **Comment Types** - General, Status update, System-generated

---

## Technology Stack

### Frontend

- Angular 19 (Standalone components)
- TypeScript
- RxJS for reactive programming
- Custom CSS with purple/blue theme (no external UI libraries)

### Backend (Optional)

The backend is optional. The application can run entirely with mock data.

- Node.js with Express
- SQLite database (better-sqlite3)
- CORS enabled for local development

---

## Quick Start

### Prerequisites

- Node.js 20.19 or higher
- npm (included with Node.js)
- Angular CLI: `npm install -g @angular/cli`

### Installation

**1. Clone the repository**

```bash
git clone <your-repo-url>
cd SWIFTLY
```

**2. Install frontend dependencies**

```bash
cd frontend
npm install
```

**3. Start the frontend (with mock data)**

```bash
ng serve --open
```

The app will open automatically at `http://localhost:4200`.

### Optional: Run with Backend

If you want to use the full backend with a persistent database:

**1. Install backend dependencies**

```bash
cd backend
npm install
```

**2. Start the backend server**

```bash
node server.js
```

The server will run at `http://localhost:3000`.

**3. Connect the frontend to the backend**

In `frontend/src/app/services/api.service.ts`, uncomment the HTTP client code and comment out the mock data section.

---

## Project Structure

```
SWIFTLY/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── agents/          # Agent management
│   │   │   ├── dashboard/       # Dashboard view
│   │   │   ├── layout/          # Sidebar and Header
│   │   │   ├── requests/        # Request list and detail
│   │   │   ├── services/        # API service
│   │   │   └── models.ts        # TypeScript interfaces
│   │   ├── assets/              # Static assets
│   │   ├── index.html           # Main HTML
│   │   └── styles.css           # Global styles
│   └── package.json
│
└── backend/
    ├── server.js                # Express server
    ├── database.sqlite          # SQLite database
    └── package.json
```

---

## Usage Guide

### Admin Permissions

- View all requests in the system
- Create new requests
- Assign agents to requests
- Change the status of any request
- Delete requests
- Add and remove agents
- View overdue warnings and escalated priorities

### Agent Permissions

- View only requests assigned to them
- Update the status of their assigned requests
- Add comments to requests
- Mark tasks as Blocked or Done
- View overdue warnings for their assignments

### Request Workflow

Status transitions follow these rules:

- **Open** - Can move to: In Progress, Blocked
- **In Progress** - Can move to: Done, Blocked
- **Blocked** - Can move to: In Progress
- **Done** - No further transitions allowed

---

## Business Rules

- A request cannot be marked as Done if it is unassigned
- Requests overdue by more than 3 days are automatically escalated to Critical priority
- Overdue requests are flagged visually in the UI
- System comments are automatically generated for status changes, assignments, and escalations

---

## Design Principles Applied

### 1. Clarity

The UI is structured to reduce cognitive load by grouping related information and using visual hierarchy consistently. Each request card displays only the most decision-relevant fields at a glance - title, status badge, priority indicator, and due date - while keeping secondary details (comments, full description, tags) available within the detail view. The Dashboard provides a high-level statistics panel so users can immediately assess system health without scanning individual records. Status and priority values use distinct color coding (e.g., Critical in red, Done in green) to allow rapid scanning without reading labels.

### 2. Consistency

All interactive elements follow the same visual and behavioral patterns across the application. Buttons, form inputs, status badges, and card layouts use a unified component style defined in `styles.css`. The purple/blue theme is applied uniformly - primary actions use `#7c3aed`, destructive actions use red tones, and success states use green tones with purple accents throughout. Navigation behavior is consistent: the sidebar remains fixed across all views, and breadcrumb-style page titles always reflect the current location. Form layouts for creating and editing requests mirror one another, so users apply the same mental model in both contexts.

### 3. Feedback

The system communicates state changes clearly at every interaction point. Status transitions trigger automatically generated system comments (e.g., "Status changed from Open to In Progress"), giving users a timestamped audit trail without manual input. Overdue requests display a visible warning flag in the request list and detail views. Priority escalation to Critical after 3 days overdue is reflected immediately in the UI badge. Loading states are handled explicitly - if the dashboard data fails to load, a "Loading dashboard data..." indicator is shown rather than an empty or broken view, directing users to check the console or configuration.

### 4. Accessibility

The UI is built with sufficient color contrast ratios between the dark card backgrounds (`#1a1f2e`) and primary text (`#f1f5f9`) to meet readability standards. Secondary text uses `#94a3b8`, which maintains legibility against the dark background. The application is fully responsive, with table layouts transforming into card-based layouts on mobile (below 600px), ensuring the interface is usable across device types and screen sizes. Interactive controls (buttons, form fields, navigation links) are implemented as semantic HTML elements, supporting keyboard navigation and compatibility with screen readers without requiring custom ARIA overrides.

### 5. Efficiency

The application minimizes the steps required to complete common tasks. The request list includes inline search, multi-criteria filtering (by status, priority, agent, overdue), and sorting options on a single screen, so users can narrow to relevant work without navigating away. Agents see only their assigned requests by default, eliminating irrelevant noise. The comment system allows quick status updates directly from the request detail view, without requiring a separate edit flow. System-generated comments automate routine documentation (assignments, escalations, status changes), reducing manual overhead for both admins and agents.

---

## Mock Data

The application includes pre-configured mock data so you can start immediately without a backend.

**Default Admin User**

- ID: admin-1
- Name: System Admin
- Role: Admin

**Default Agents**

- John Doe (agent-1)
- Jane Smith (agent-2)
- Alex Johnson (agent-3)
- Sarah Lee (agent-4)

**Sample Requests**

The system includes 6 sample requests covering a range of priorities (Low, Medium, High, Critical), statuses (Open, In Progress, Blocked, Done), agent assignments, tags, and due dates, including overdue examples.

---

## Responsive Design

The application is fully responsive across the following breakpoints:

- Desktop: 1200px and above
- Laptop: 900px to 1200px
- Tablet: 600px to 900px
- Mobile: below 600px

On mobile devices, table layouts transform into card layouts for improved usability.

---

## Color Scheme

| Element          | Value     |
|------------------|-----------|
| Primary Purple   | `#7c3aed` |
| Dark Background  | `#0a0f1c` |
| Card Background  | `#1a1f2e` |
| Primary Text     | `#f1f5f9` |
| Secondary Text   | `#94a3b8` |
| Borders          | `#2d2f3e` |
| Success          | Green tones with purple accents |
| Danger           | Red tones with purple accents   |
| Warning          | Orange tones with purple accents |

---

## Troubleshooting

**App shows "Loading dashboard data..." indefinitely**

- Open the browser console (F12) and check for errors
- If using mock data, verify that `api.service.ts` is configured to use mock data, not the HTTP client
- Clear browser cache and reload

**TypeScript errors on install**

- Run `npm install` to ensure all dependencies are present
- If errors persist, delete `node_modules` and `package-lock.json`, then run `npm install` again

**Backend connection issues**

- Confirm the backend is running on port 3000
- Check CORS configuration in `server.js`
- Verify the API URL in `api.service.ts`

---

## Development

### Routing Configuration

`frontend/src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestListComponent } from './requests/request-list.component';
import { RequestDetailComponent } from './requests/request-detail.component';
import { AgentsComponent } from './agents/agents.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'requests', component: RequestListComponent },
  { path: 'requests/:id', component: RequestDetailComponent },
  { path: 'agents', component: AgentsComponent },
  { path: '**', redirectTo: '' }
];
```

### Running with Real Backend

```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && ng serve
```

Update `api.service.ts` to use the HTTP client instead of mock data.

### Building for Production

```bash
cd frontend
ng build --prod
```

Build artifacts are output to the `dist/` directory.

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add your feature description'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For support, email support@swiftly.com or open an issue in the repository.
