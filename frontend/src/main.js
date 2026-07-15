import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { API_BASE, apiRequest } from './api.js';
import { LoginRegisterPanel } from './components/LoginRegisterPanel.js';
import { AdminDashboard } from './components/AdminDashboard.js';

createApp({
  components: { LoginRegisterPanel, AdminDashboard },
  data() {
    return {
      token: localStorage.getItem('token') || '',
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      message: '',
      adminPage: 'stats',
      state: {
        login: { email: '', password: '' },
        student: { email: '', password: '', full_name: '', phone: '', branch: '', cgpa: '', year: '' },
        company: { email: '', password: '', company_name: '', hr_contact: '', website: '', description: '' },
        admin: { q: '', stats: {}, companies: [], drives: [], students: [], applications: [], searchResults: null },
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
    goToDashboard() {
      if (!this.user) return;
      if (this.user.role === 'admin') {
        this.adminPage = 'stats';
        this.loadAdminStats();
        this.loadAdminCompanies();
        this.loadAdminDrives();
        this.loadAdminStudents();
        this.loadAdminApplications();
      }
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

      <div v-else class="card glass text-center py-5">
        <div class="card-body">
          <h3 class="text-success">Authenticated Successfully</h3>
          <p class="text-muted">You are logged in as a {{ user ? user.role : '' }}. Role-based dashboard for this role is not active in Milestone 3.</p>
        </div>
      </div>

      <div v-if="message" class="alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg" style="z-index: 1050; max-width: 500px; width: 90%;" role="alert">
        <div>{{ message }}</div>
        <button type="button" class="btn-close" @click="message = ''" aria-label="Close"></button>
      </div>
    </div>
  `,
}).mount('#app');
