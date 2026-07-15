# Placement Portal Application (PPA) - V2

A modern, role-based campus recruitment portal designed to streamline coordination between **Institute Admins**, **Registrants (Students)**, and **Recruiters (Companies)**.

Built on the required educational stack: **Flask** (API), **Vue.js 3** (ESM Modules Frontend), **Bootstrap 5** (Styling), **SQLite** (Database), **Redis** (Caching/Session), and **Celery** (Asynchronous & Periodic Batch Jobs).

---

## 🚀 Key Features by Roles

### 🧑‍💼 Institute Placement Admin
* **Seeded Account**: Pre-configured superuser account (no registration allowed).
* **Company Approvals**: Review pending company applications, approve legitimate organizations, or blacklist/deactivate profiles.
* **Placement Drives**: Admin oversight of job opportunities before they go live for students.
* **Aggregated Stats**: High-level statistics on applicant ratios, placements, and participation rates.
* **Global Search**: Search records indexing students, companies, and drive titles simultaneously.

### 🏢 Recruiter (Company)
* **Company Registration**: Request registration with HR contacts, description, and website urls.
* **Recruitment Events**: Create placement drives (restricted unless approved by Admin) detailing branches, minimum CGPA, year, deadline, location, and CTC.
* **Applicant Pipeline**: Move student applicants across pipeline phases: `applied` ➔ `shortlisted` ➔ `interview_scheduled` ➔ `selected` or `rejected`.
* **Interview Scheduler**: Set dates, times, and add specific remarks for shortlisted applicants.

### 🎓 Student
* **Self-Registration**: Access key input parameters (CGPA, year, branch, and contact numbers).
* **Placement Drives Feed**: View approved job positions with dynamic branch, CGPA, and deadline eligibility filters.
* **One-Click Application**: Single application check constraints per drive (backed by SQLite unique constraints).
* **Resume Uploads**: Upload resume files in `.pdf`, `.doc`, or `.docx` formats, served from a local storage upload directory.
* **Async CSV Export**: Request download of placement application history served asynchronously in the background.

---

## 🛠️ Tech Stack & Architecture

### Backend Core
* **Flask (3.0.3)**: Handles REST API Routing.
* **Flask-SQLAlchemy**: ORM layer managing transactional models in **SQLite**.
* **Flask-JWT-Extended**: Handles stateless authentication and role checks (`@role_required`).
* **Flask-Caching**: Connected to **Redis** for sub-millisecond route response retrieval.
* **Flask-Session**: Backed by **Redis** storage client.

### Frontend SPA
* **Vue.js 3**: Progressive layout structure using ESM browser compilation.
* **Bootstrap 5**: Responsive styles and card graphics (glassmorphism aesthetics).
* **Fetch Client**: Custom API pipeline (`api.js`) with failover routes.

### Background Task Engine
* **Celery**: Runs asynchronous tasks and periodic schedules (Beat).
* **Redis**: Used as the broker and results backend.

---

## 📂 Project Structure

```text
Demo-App-MAD2-main/
├── backend/
│   ├── app.py                  # Main Flask Entry Point & SPA Router
│   ├── config.py               # Database, Caching, and Celery Configurations
│   ├── database_config.py      # Programmatic DB Tables and Admin Seeder
│   ├── extensions.py           # Flask Extension Instances
│   ├── models/
│   │   └── __init__.py         # DB Models (User, StudentProfile, CompanyProfile, etc.)
│   ├── routes/
│   │   ├── admin.py            # Admin REST endpoints
│   │   ├── auth.py             # User authentication and registration
│   │   ├── company.py          # Company activities and drives pipeline
│   │   ├── student.py          # Student profile, drives application, and exports
│   │   └── utils.py            # Role execution wrappers
│   └── tasks/
│       ├── celery_app.py       # Celery configuration and periodic Cron schedules
│       └── jobs.py             # Periodic reports, webhook notifications, and CSV workers
└── frontend/
    ├── index.html              # Core mount template loading Bootstrap 5
    └── src/
        ├── api.js              # Fetch backend client wrapper
        ├── main.js             # Primary Vue Single Page app logic
        └── components/         # Shared ESM View components
            ├── LoginRegisterPanel.js
            ├── AdminDashboard.js
            ├── CompanyDashboard.js
            └── StudentDashboard.js
```

---

## 📥 Setup & Installation (Windows Guidelines)

### Prerequisites
1. **Python**: Ensure Python 3.10+ is installed on your local machine.
2. **Redis Server**: Make sure Redis is installed and running on `localhost:6379`.
   * For Windows, run Redis via **WSL** (`sudo service redis-server start`) or use the native Redis executable.

### 1. Initialize Python Backend
Navigate to the backend folder, create a virtual environment, and install dependencies:

```powershell
# Open terminal inside repository
cd backend

# Create Virtual Environment
python -m venv .venv

# Activate Virtual Environment (PowerShell)
.venv\Scripts\Activate.ps1

# Activate Virtual Environment (CMD)
# .venv\Scripts\activate.bat

# Install Dependencies
pip install -r requirements.txt
```

### 2. Start the API Server
Ensure your virtual environment is active, then launch Flask:

```powershell
python app.py
```
*The database table creation and default administrator seeding will trigger programmatically when the app runs for the first time.*

### 3. Run Celery Workers & Periodic Beats
To process reminders, monthly HTML reports, and async CSV exports:

* **Start Celery Worker**:
  ```powershell
  celery -A tasks.celery_app.celery worker --loglevel=info
  ```
* **Start Celery Beat Scheduler** (in another terminal):
  ```powershell
  celery -A tasks.celery_app.celery beat --loglevel=info
  ```

### 4. Serve the Frontend
Because we are utilizing ES6 module imports, files must be served over an HTTP network rather than local disk paths.

In a separate terminal, serve the frontend directory (e.g. on port 8080):

```powershell
cd frontend
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🔑 Default Administrator Credentials
* **Email**: `admin@ppa.local`
* **Password**: `admin123`

---

## 📬 API Reference Endpoints

| URL Route | Method | Access | Action |
| :--- | :---: | :---: | :--- |
| `/api/auth/register/student` | POST | Public | Registers a new student profile |
| `/api/auth/register/company` | POST | Public | Submits company profile for admin approval |
| `/api/auth/login` | POST | Public | Authenticates and returns JWT access token |
| `/api/admin/dashboard` | GET | Admin | Retrieves statistical totals dashboard |
| `/api/admin/search` | GET | Admin | Search query engine |
| `/api/company/drives` | POST | Company | Create recruitment drive (approved companies only) |
| `/api/company/applications` | GET | Company | Track company drive applicants |
| `/api/student/drives` | GET | Student | List approved & eligibility-filtered drives |
| `/api/student/drives/<id>/apply` | POST | Student | Enrols student if criteria filters pass |
| `/api/student/export/request` | POST | Student | Dispatches async CSV background job |

---

## 🕒 Background Job Workflows

1. **Daily Reminders**: Celery Beat schedules task `run_daily_reminders` at `9:00 AM` daily. Grabs drives closing in the next 2 days and issues webhook updates to Google Chat or falls back to system emails.
2. **Monthly Admin Report**: Beat fires `run_monthly_report` on the 1st of every month at `10:00 AM`. Generates summary placement HTML cards and emails them to the admin.
3. **CSV Exporting**: When clicked on the student dashboard, backend registers a background Celery task. The UI polls the task status and down-links the output via a server-buffered file stream once completed.
