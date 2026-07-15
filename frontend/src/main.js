import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { API_BASE, apiRequest } from './api.js';
import { LoginRegisterPanel } from './components/LoginRegisterPanel.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { CompanyDashboard } from './components/CompanyDashboard.js';
import { StudentDashboard } from './components/StudentDashboard.js';

createApp({
  components: { LoginRegisterPanel, AdminDashboard, CompanyDashboard, StudentDashboard },
  data() {
    return {
      token: localStorage.getItem('token') || '',
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      message: '',
      adminPage: 'stats',
      studentPage: 'stats',
      companyPage: 'stats',
      state: {
        login: { email: '', password: '' },
        student: { email: '', password: '', full_name: '', phone: '', branch: '', cgpa: '', year: '' },
        company: { email: '', password: '', company_name: '', hr_contact: '', website: '', description: '' },
        admin: { q: '', stats: {}, companies: [], drives: [], students: [], applications: [], searchResults: null },
        companyPanel: { summary: null, drives: [], applications: [] },
        drive: { job_title: '', job_description: '', eligible_branch: '', eligible_year: '', min_cgpa: '', application_deadline: '', location: '', ctc_lpa: '' },
        studentPanel: { summary: null, companies: [], drives: [], applications: [], profile: null, resumeFileName: '', search: '', companySearch: '' },
        profileForm: { full_name: '', phone: '', branch: '', cgpa: '', year: '', resume_link: '' },
      },
    };
  },
  methods: {
    async initDb() {
      return this.run(async () => {
        this.message = (await apiRequest('/init', { method: 'POST' })).message;
      });
    },
    async login() {
      return this.run(async () => {
        const data = await apiRequest('/auth/login', { method: 'POST', body: this.state.login });
        this.token = data.access_token;
        this.user = data.user;
        localStorage.setItem('token', this.token); localStorage.setItem('user', JSON.stringify(this.user));
        this.message = 'Login successful';

        if (this.user.role === 'admin') {
          await this.loadAdminStats();
          await this.loadAdminCompanies();
          await this.loadAdminDrives();
          await this.loadAdminStudents();
          await this.loadAdminApplications();
        }
        if (this.user.role === 'company') {
          await this.loadCompanyDashboard();
          await this.loadCompanyDrives();
        }
        if (this.user.role === 'student') {
          await this.loadStudentDashboard();
          await this.loadStudentProfile();
          await this.loadStudentCompanies();
          await this.loadStudentDrives();
          await this.loadStudentApplications();
        }
      });
    },
    async registerStudent() {
      return this.run(async () => {
        this.message = (await apiRequest('/auth/register/student', { method: 'POST', body: this.state.student })).message;
      });
    },
    async registerCompany() {
      return this.run(async () => {
        this.message = (await apiRequest('/auth/register/company', { method: 'POST', body: this.state.company })).message;
      });
    },
    async loadAdminStats() {
      return this.run(async () => { this.state.admin.stats = await apiRequest('/admin/dashboard', { token: this.token }); });
    },
    async loadAdminCompanies() {
      return this.run(async () => { this.state.admin.companies = await apiRequest('/admin/companies', { token: this.token }); });
    },
    async loadAdminDrives() {
      return this.run(async () => { this.state.admin.drives = await apiRequest('/admin/drives', { token: this.token }); });
    },
    async loadAdminStudents() {
      return this.run(async () => { this.state.admin.students = await apiRequest('/admin/students', { token: this.token }); });
    },
    async loadAdminApplications() {
      return this.run(async () => { this.state.admin.applications = await apiRequest('/admin/applications', { token: this.token }); });
    },
    async searchAdmin() {
      return this.run(async () => {
        this.state.admin.searchResults = await apiRequest(`/admin/search?q=${encodeURIComponent(this.state.admin.q)}`, { token: this.token });
      });
    },
    async updateCompanyStatus(companyId, status) {
      return this.run(async () => {
        await apiRequest(`/admin/companies/${companyId}/status`, { token: this.token, method: 'PATCH', body: { status } });
        await this.loadAdminCompanies();
        await this.loadAdminStats();
      });
    },
    async updateDriveStatus(driveId, status) {
      return this.run(async () => {
        await apiRequest(`/admin/drives/${driveId}/status`, { token: this.token, method: 'PATCH', body: { status } });
        await this.loadAdminDrives();
        await this.loadAdminStats();
      });
    },
    async toggleUserActive(userId, active) {
      return this.run(async () => {
        await apiRequest(`/admin/users/${userId}/active`, { token: this.token, method: 'PATCH', body: { active } });
        await this.loadAdminCompanies();
        await this.loadAdminStudents();
      });
    },
    async loadCompanyDashboard() {
      return this.run(async () => { this.state.companyPanel.summary = await apiRequest('/company/dashboard', { token: this.token }); });
    },
    async loadCompanyDrives() {
      return this.run(async () => { this.state.companyPanel.drives = await apiRequest('/company/drives', { token: this.token }); });
    },
    async loadCompanyApplications() {
      return this.run(async () => { this.state.companyPanel.applications = await apiRequest('/company/applications', { token: this.token }); });
    },
    async createDrive() {
      return this.run(async () => {
        this.message = (await apiRequest('/company/drives', { token: this.token, method: 'POST', body: this.state.drive })).message;
        await this.loadCompanyDashboard();
        await this.loadCompanyDrives();
      });
    },
    async updateCompanyApplication(applicationId, status, interviewAt, remarks) {
      return this.run(async () => {
        const body = { status, remarks };
        if (interviewAt) body.interview_at = interviewAt;
        await apiRequest(`/company/applications/${applicationId}`, { token: this.token, method: 'PATCH', body });
        await this.loadCompanyApplications();
      });
    },
    async loadStudentDashboard() {
      return this.run(async () => { this.state.studentPanel.summary = await apiRequest('/student/dashboard', { token: this.token }); });
    },
    async loadStudentProfile() {
      return this.run(async () => {
        const profile = await apiRequest('/student/profile', { token: this.token });
        this.state.studentPanel.profile = profile;
        this.state.profileForm = { ...profile };
      });
    },
    async loadStudentCompanies() {
      return this.run(async () => {
        const query = this.state.studentPanel.companySearch ? `?q=${encodeURIComponent(this.state.studentPanel.companySearch)}` : '';
        this.state.studentPanel.companies = await apiRequest(`/student/companies${query}`, { token: this.token });
      });
    },
    async saveStudentProfile() {
      return this.run(async () => {
        this.message = (await apiRequest('/student/profile', { token: this.token, method: 'PATCH', body: this.state.profileForm })).message;
        await this.loadStudentDashboard();
        await this.loadStudentProfile();
      });
    },
    async uploadResume(file) {
      return this.run(async () => {
        if (!file) throw new Error('Choose a resume file first');
        const formData = new FormData();
        formData.append('resume', file);
        const response = await fetch(`${API_BASE}/student/resume`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Resume upload failed');
        this.message = payload.message;
        await this.loadStudentProfile();
      });
    },
    async loadStudentDrives() {
      return this.run(async () => {
        const query = this.state.studentPanel.search ? `?q=${encodeURIComponent(this.state.studentPanel.search)}` : '';
        this.state.studentPanel.drives = await apiRequest(`/student/drives${query}`, { token: this.token });
      });
    },
    async loadStudentApplications() {
      return this.run(async () => { this.state.studentPanel.applications = await apiRequest('/student/applications', { token: this.token }); });
    },
    async applyDrive(id) {
      return this.run(async () => {
        this.message = (await apiRequest(`/student/drives/${id}/apply`, { token: this.token, method: 'POST' })).message;
        const drive = this.state.studentPanel.drives.find(d => d.drive_id === id);
        if (drive) {
          drive.already_applied = true;
        }
        await this.loadStudentApplications();
      });
    },
    async sendAdminReminders() {
      return this.run(async () => {
        this.message = (await apiRequest('/admin/reminders', { token: this.token, method: 'POST' })).message;
      });
    },
    async generateAdminReport() {
      return this.run(async () => {
        const result = await apiRequest('/admin/report', { token: this.token, method: 'POST' });
        this.message = result.message;
      });
    },
    async exportCsv() {
      return this.run(async () => {
        const requestTask = await apiRequest('/student/export/request', { token: this.token, method: 'POST' });
        let taskData = requestTask;
        if (!taskData.download_ready) {
          this.message = 'Preparing CSV export in background...';
          for (let i = 0; i < 8; i += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            taskData = await apiRequest(`/student/export/status/${requestTask.task_id}`, { token: this.token });
            if (taskData.download_ready) break;
          }
        }

        const downloadUrl = `${API_BASE}/student/export/download/${requestTask.task_id}`;
        const response = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${this.token}` } });
        if (!response.ok) throw new Error('Export not ready yet');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'application_history.csv'; a.click();
        URL.revokeObjectURL(url);
        this.message = 'CSV export is ready and downloaded';
      });
    },
    goToDashboard() {
      if (!this.user) return;
      if (this.user.role === 'admin') {
        this.adminPage = 'stats';
        this.loadAdminStats();
        this.loadAdminCompanies();
        this.loadAdminDrives();
        this.loadAdminStudents();
        this.loadAdminApplications();
      } else if (this.user.role === 'company') {
        this.companyPage = 'stats';
        this.loadCompanyDashboard();
        this.loadCompanyDrives();
        this.loadCompanyApplications();
      } else if (this.user.role === 'student') {
        this.studentPage = 'stats';
        this.loadStudentDashboard();
        this.loadStudentProfile();
        this.loadStudentCompanies();
        this.loadStudentDrives();
        this.loadStudentApplications();
      }
    },
    async refreshSession() {
      if (!this.token || !this.user) return;
      this.message = 'Refreshing dashboard...';
      await this.goToDashboard();
    },
    run(fn) {
      return fn().catch((e) => { this.message = e.message || 'Operation failed'; });
    },
    logout() { this.token = ''; this.user = null; localStorage.clear(); },
  },
  mounted() {
    if (this.token && this.user) {
      this.goToDashboard();
    }
  },
  template: `
    <div>
      <nav v-if="token" class="navbar navbar-expand-lg navbar-light glass rounded mb-3 px-3">
        <div class="container-fluid px-0">
          <span class="navbar-brand mb-0 h1">PlaceNow</span>
          <div v-if="user && user.role === 'admin'" class="d-flex gap-2 ms-3">
            <button class="btn btn-sm" :class="adminPage === 'companies_drives' ? 'btn-primary' : 'btn-outline-primary'" @click="adminPage = 'companies_drives'">Companies & Drives</button>
            <button class="btn btn-sm" :class="adminPage === 'students' ? 'btn-primary' : 'btn-outline-primary'" @click="adminPage = 'students'">Students</button>
            <button class="btn btn-sm" :class="adminPage === 'applications' ? 'btn-primary' : 'btn-outline-primary'" @click="adminPage = 'applications'">Applications</button>
          </div>
          <div v-if="user && user.role === 'student'" class="d-flex gap-2 ms-3">
            <button class="btn btn-sm" :class="studentPage === 'drives' ? 'btn-primary' : 'btn-outline-primary'" @click="studentPage = 'drives'">Placement Drives</button>
            <button class="btn btn-sm" :class="studentPage === 'applications' ? 'btn-primary' : 'btn-outline-primary'" @click="studentPage = 'applications'">My Applications</button>
            <button class="btn btn-sm" :class="studentPage === 'profile' ? 'btn-primary' : 'btn-outline-primary'" @click="studentPage = 'profile'">Edit Profile</button>
          </div>
          <div v-if="user && user.role === 'company'" class="d-flex gap-2 ms-3">
            <button class="btn btn-sm" :class="companyPage === 'create_drive' ? 'btn-primary' : 'btn-outline-primary'" @click="companyPage = 'create_drive'">Create Drive</button>
            <button class="btn btn-sm" :class="companyPage === 'drives' ? 'btn-primary' : 'btn-outline-primary'" @click="companyPage = 'drives'">Placement Drives</button>
            <button class="btn btn-sm" :class="companyPage === 'applicants' ? 'btn-primary' : 'btn-outline-primary'" @click="companyPage = 'applicants'">Applicants</button>
          </div>
          <div class="d-flex gap-2 ms-auto">
            <button class="btn btn-outline-primary btn-sm" @click="goToDashboard">Dashboard</button>
            <button class="btn btn-outline-danger btn-sm" @click="logout">Logout</button>
          </div>
        </div>
      </nav>

      <login-register-panel
        v-if="!token"
        :state="state"
        :on-login="login.bind(this)"
        :on-register-student="registerStudent.bind(this)"
        :on-register-company="registerCompany.bind(this)"
        :on-init-db="initDb.bind(this)"
      />

      <admin-dashboard
        v-else-if="user && user.role==='admin'"
        :state="state"
        :admin-page="adminPage"
        :reload-stats="loadAdminStats.bind(this)"
        :load-companies="loadAdminCompanies.bind(this)"
        :load-drives="loadAdminDrives.bind(this)"
        :load-students="loadAdminStudents.bind(this)"
        :load-applications="loadAdminApplications.bind(this)"
        :search="searchAdmin.bind(this)"
        :update-company-status="updateCompanyStatus.bind(this)"
        :update-drive-status="updateDriveStatus.bind(this)"
        :toggle-user-active="toggleUserActive.bind(this)"
        @send-reminders="sendAdminReminders"
        @generate-report="generateAdminReport"
      />

      <company-dashboard
        v-else-if="user && user.role==='company'"
        :state="state"
        :company-page="companyPage"
        :load-dashboard="loadCompanyDashboard.bind(this)"
        :load-drives="loadCompanyDrives.bind(this)"
        :load-applications="loadCompanyApplications.bind(this)"
        :create-drive="createDrive.bind(this)"
        :update-application="updateCompanyApplication.bind(this)"
      />

      <student-dashboard
        v-else-if="user && user.role==='student'"
        :state="state"
        :student-page="studentPage"
        :load-student-dashboard="loadStudentDashboard.bind(this)"
        :load-student-profile="loadStudentProfile.bind(this)"
        :load-student-companies="loadStudentCompanies.bind(this)"
        :save-student-profile="saveStudentProfile.bind(this)"
        :upload-resume="uploadResume.bind(this)"
        :load-student-drives="loadStudentDrives.bind(this)"
        :load-applications="loadStudentApplications.bind(this)"
        :apply-drive="applyDrive.bind(this)"
        :export-csv="exportCsv.bind(this)"
      />

      <div v-if="message" class="alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg" style="z-index: 1050; max-width: 500px; width: 90%;" role="alert">
        <div>{{ message }}</div>
        <button type="button" class="btn-close" @click="message = ''" aria-label="Close"></button>
      </div>
    </div>
  `,
}).mount('#app');
