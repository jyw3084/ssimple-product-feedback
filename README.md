# ssimple Product Feedback Platform

**[Live Demo](https://ssimple-product-feedback.web.app/)**

[![Next.js](https://img.shields.io/badge/Next.js-13.4.12-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9.9.2-orange?logo=firebase)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.2.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

[Features](#key-features) • [Architecture](#architecture--design-patterns) • [Tech Stack](#technology-stack) • [Setup](#development-setup) • [Database](#database-schema)

---

## Overview

A feedback collection and management platform enabling businesses to gather, organize, and respond to user feedback. Features include impact-based voting, threaded discussions, admin moderation tools, and automated email workflows.

### Technical Highlights

- **Multi-tenant SaaS Architecture** with complete account isolation
- **Real-time Data Synchronization** via Firestore listeners
- **Serverless Background Jobs** using Inngest for scheduled workflows
- **Type-safe Development** with TypeScript and strict interfaces
- **Advanced File Management** supporting images/videos with Firebase Storage
- **Security-first Design** with XSS prevention, route guards, and query-level access control
- **Responsive Design** with mobile-first Tailwind CSS approach

---

## Key Features

### 1. **Feedback Submission & Categorization**
Users can submit feedback categorized as bugs or feature requests. The system captures:
- Rich text descriptions with automatic URL linkification (sanitized via DOMPurify)
- File attachments (images/videos) with drag-and-drop upload
- Device information and console logs for bug reports
- Public/private visibility controls


### 2. **Impact-Based Voting System**
Goes beyond simple upvotes with three impact levels:
- **Strongly Agree** (impact: 2)
- **Agree** (impact: 1)
- **Disagree** (impact: 0)

Each vote can include optional feedback explaining the user's perspective. Admin dashboard displays sentiment breakdown showing distribution across impact levels.

### 3. **Threaded Comment System**
Supports nested replies with full thread tracking:
- Parent-child comment relationships
- Role-based styling (admin vs. user comments)
- File attachments on comments
- Real-time updates via Firestore listeners


### 4. **Admin Dashboard**
Comprehensive management interface with:
- Feedback filtering (visibility, progress, type)
- Sorting (by date, by popularity)
- Status management (open → in progress → done)
- Comment moderation with notification emails
- Sentiment analysis visualization
- Cascading deletion (removes all associated comments, votes, files)

### 5. **Automated Email Workflows**
Event-driven and scheduled email automation:
- **Welcome emails** on new submission
- **Admin notifications** for new feedback
- **Weekly digest** emails (cron: Thursdays 3 PM PST)
- **Reply notifications** when admins respond

Uses React Email for component-based templates and Resend for delivery.

### 6. **Embeddable Widget**
Standalone widget page for iframe embedding:
- Configurable branding (colors, logo, title)
- Isolated submission flow
- Private feedback channel for internal testing
- Device info capture for bug reports

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 13.4.12 | React framework with SSR, file-based routing, API routes |
| **React** | 18.2.0 | UI component library with hooks |
| **TypeScript** | 5.0.4 | Type safety and developer experience |
| **Tailwind CSS** | 3.2.4 | Utility-first CSS framework |
| **React Hook Form** | 7.43.1 | Form validation and state management |
| **FilePond** | 4.30.4 | File upload with preview, validation, and drag-and-drop |
| **DOMPurify** | 3.0.6 | XSS protection for user-generated content |
| **React Player** | 2.11.0 | Video playback for attachments |

### Backend & Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **Firebase Auth** | 9.9.2 | Email/password authentication |
| **Firestore** | 9.9.2 | NoSQL database with real-time listeners |
| **Firebase Storage** | 9.9.2 | File storage for images/videos |
| **Inngest** | 3.15.5 | Serverless workflow orchestration |
| **Resend** | 1.1.0 | Transactional email delivery |
| **React Email** | 2.1.0 | React-based email templates |

---

## Architecture & Design Patterns

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Next.js (SSR/CSR) + React + TypeScript + Tailwind CSS     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   AUTHENTICATION LAYER                       │
│  Firebase Auth + AuthContext Provider + ProtectedRoute HOC  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                      API LAYER (Next.js)                     │
│  /api/send (Email) | /api/inngest (Background Jobs)        │
└─────┬────────────┬─────────────────────────────────────────┘
      │            │
      ▼            ▼
┌─────────┐  ┌──────────────────────────────────────┐
│ Resend  │  │         DATA & STORAGE LAYER         │
│  Email  │  │  Firestore (8 collections)           │
│ Service │  │  Firebase Storage (uploads/)         │
└─────────┘  └──────────────────────────────────────┘
                     ▲
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  BACKGROUND JOB LAYER                        │
│  Inngest (Cron jobs + Event-driven workflows)               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Form Submit → API Route / Firestore Write
                              ↓
                       Firestore Listener
                              ↓
                       Component Re-render
```

### Background Jobs (Inngest)

**Architecture**: Event-driven serverless functions

```typescript
// Cron-triggered weekly email job
inngest.createScheduledFunction(
  { id: "cron-weekly-reminder" },
  { cron: "TZ=America/Los_Angeles 0 15 * * 4" }, // Thurs 3pm PST
  async ({ step }) => {
    // Step 1: Fetch recent feedback
    const feedback = await step.run("fetch-feedback", async () => {
      return queryFirestore({ last7Days: true });
    });

    // Step 2: Fan-out to all users
    await step.run("send-emails", async () => {
      return Promise.all(users.map(user => sendEmail(user, feedback)));
    });
  }
);
```

**Benefits**:
- No server infrastructure to manage
- Automatic retries on failure
- Step-based execution with checkpoints
- Built-in observability

---

## Project Structure

```
ssimple-product-feedback/
├── src/
│   ├── pages/                    # Next.js pages and API routes
│   │   ├── _app.tsx             # App wrapper with AuthContext
│   │   ├── _document.tsx        # HTML document template
│   │   ├── index.tsx            # Public feedback board
│   │   ├── new.tsx              # Feedback submission form
│   │   ├── login.tsx            # Admin authentication
│   │   ├── widget.tsx           # Embeddable feedback widget
│   │   ├── api/
│   │   │   ├── send.ts          # Email API endpoint
│   │   │   ├── send-demo.ts     # Demo email endpoint
│   │   │   └── inngest.ts       # Inngest webhook handler
│   │   └── admin/
│   │       ├── index.tsx        # Admin dashboard
│   │       ├── feedback.tsx     # Feedback management
│   │       └── settings.tsx     # Account settings
│   │
│   ├── components/              # Reusable React components
│   │   ├── Comment.tsx          # Comment display with threading
│   │   ├── Reply.tsx            # Comment reply component
│   │   ├── Upvotes.tsx          # Vote count display
│   │   ├── Linkify.tsx          # URL detection and sanitization
│   │   ├── Sidebar.tsx          # Admin navigation
│   │   ├── ProtectedRoute.tsx   # Auth guard HOC
│   │   ├── Loading.tsx          # Loading skeleton
│   │   └── SingleTableRow.tsx   # Table row component
│   │
│   ├── context/                 # React Context providers
│   │   └── AuthContext.js       # Firebase auth state management
│   │
│   ├── config/                  # Configuration files
│   │   └── firebase.js          # Firebase SDK initialization
│   │
│   ├── utils/                   # Utilities and types
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── inngestClient.ts     # Inngest client setup
│   │
│   ├── jobs/                    # Background job definitions
│   │   ├── sendWeeklyReminderEmailJob.ts
│   │   └── cronWeeklyReminderEmailsJob.ts
│   │
│   ├── mailers/                 # Email generation
│   │   ├── weeklyReminderMailer.tsx
│   │   ├── surveyDemoMailer.tsx
│   │   └── templates/           # React Email templates
│   │       ├── SurveyDemoEmail.tsx
│   │       └── WeeklyReminderEmail.tsx
│   │
│   └── styles/
│       └── global.css           # Global styles and imports
│
├── public/                      # Static assets
│
├── .firebase/                   # Firebase deployment cache
├── .next/                       # Next.js build output
├── node_modules/                # Dependencies
│
├── firebase.json                # Firebase hosting config
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS config
├── tsconfig.json                # TypeScript configuration
├── postcss.config.js            # PostCSS configuration
├── package.json                 # Dependencies and scripts
└── .env.local                   # Environment variables (not committed)
```

---

## API Design

### Next.js API Routes

#### `POST /api/send` - Email Delivery
Send transactional emails via Resend.

**Usage**:
- New submission notifications
- Admin reply notifications
- Weekly digest emails

#### `POST /api/inngest` - Background Job Webhook
Inngest webhook handler for serverless functions.

---

## Security Implementation

### 1. Authentication & Authorization

**Firebase Authentication**:
- Email/password authentication
- Session management via Firebase Auth SDK
- Automatic token refresh

**Route Protection**:
```typescript
// ProtectedRoute HOC
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if user exists in accounts collection
    const checkAuth = async () => {
      const accountDoc = await getDoc(doc(db, 'accounts', user.uid));
      if (accountDoc.exists()) {
        setAuthorized(true);
      } else {
        router.push('/login');
      }
    };

    if (user) checkAuth();
  }, [user]);

  return authorized ? children : <Loading />;
}
```

**All admin routes** (`/admin/*`) wrapped in `ProtectedRoute`.

### 2. Data Isolation (Multi-tenancy)

**Query-Level Security**:
```typescript
// Every Firestore query filtered by account_id
where('account_id', '==', user.uid)

// Users can ONLY access their own data
```

**Benefits**:
- No cross-tenant data leakage
- Simple permission model
- Scalable to thousands of accounts

### 3. XSS Prevention

**Input Sanitization**:
```typescript
import DOMPurify from 'dompurify';

// Sanitize user-generated content before rendering
const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['a', 'b', 'i', 'strong', 'em'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
});
```

**URL Linkification** with safe attributes:
```typescript
// Add rel="noopener noreferrer" to external links
target="_blank" rel="noopener noreferrer"
```

### 4. File Upload Security

**Validation**:
```typescript
// FilePond configuration
acceptedFileTypes: [
  'image/png', 'image/gif', 'image/jpeg',
  'image/jpg', 'image/webp',
  'video/mp4', 'video/webm'
]
maxFileSize: '10MB'
maxFiles: 5
```

**Storage Isolation**:
```
/uploads/
  /topics/{submitId}/{fileId}
  /comments/{commentId}/{fileId}
```

**Metadata Tracking**: All uploads recorded in `uploads` collection with status flags.

---

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Firestore, Auth, and Storage enabled
- Resend account for email delivery (optional)
- Inngest account for background jobs (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/jyw3084/ssimple-product-feedback.git
cd ssimple-product-feedback

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase config
```

### Environment Variables

Create `.env.local`:
```bash
# Firebase Configuration (Public)
NEXT_PUBLIC_apiKey=
NEXT_PUBLIC_authDomain=
NEXT_PUBLIC_projectId=
NEXT_PUBLIC_storageBucket=
NEXT_PUBLIC_messagingSenderId=
NEXT_PUBLIC_appId=
NEXT_PUBLIC_measurementId=
NEXT_PUBLIC_USER_URL=

# Email Service (Server-side)
RESEND_API_KEY=

# Background jobs
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
```

### Running Locally

```bash
# Development server (with hot reload)
npm run dev

# Access at http://localhost:3000
```

### Building for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

### Email Template Development

```bash
# React Email development server
npm run email

# Preview emails at http://localhost:3000
```
