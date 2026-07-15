import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { API_BASE, apiRequest } from './api.js';
import { LoginRegisterPanel } from './components/LoginRegisterPanel.js';

createApp({
  components: { LoginRegisterPanel },
  data() {
    return {
      token: localStorage.getItem('token') || '',
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      message: '',
      state: {
        login: { email: '', password: '' },
        student: { email: '', password: '', full_name: '', phone: '', branch: '', cgpa: '', year: '' },
        company: { email: '', password: '', company_name: '', hr_contact: '', website: '', description: '' },
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
    run(fn) {
      return fn().catch((e) => { this.message = e.message || 'Operation failed'; });
    },
    logout() { this.token = ''; this.user = null; localStorage.clear(); },
  },
  template: `
    <div>
      <nav v-if="token" class="navbar navbar-expand-lg navbar-light glass rounded mb-3 px-3">
        <div class="container-fluid px-0">
          <span class="navbar-brand mb-0 h1">PlaceNow</span>
          <div class="d-flex gap-2 ms-auto">
            <span class="navbar-text me-3" v-if="user">Logged in as: {{ user.email }} ({{ user.role }})</span>
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

      <div v-else class="card glass text-center py-5">
        <div class="card-body">
          <h3 class="text-success">Authenticated Successfully</h3>
          <p class="text-muted">You are logged in as a {{ user.role }}. Role-based dashboard interfaces are not active in Milestone 2.</p>
        </div>
      </div>

      <div v-if="message" class="alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg" style="z-index: 1050; max-width: 500px; width: 90%;" role="alert">
        <div>{{ message }}</div>
        <button type="button" class="btn-close" @click="message = ''" aria-label="Close"></button>
      </div>
    </div>
  `,
}).mount('#app');
