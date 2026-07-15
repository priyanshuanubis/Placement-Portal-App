export const LoginRegisterPanel = {
  props: ['state', 'onLogin', 'onRegisterStudent', 'onRegisterCompany'],
  data() {
    return {
      page: 'landing',
      registerType: 'student',
    };
  },
  methods: {
    goToLogin() {
      this.page = 'login';
    },
    goToRegister() {
      this.page = 'register';
    },
    backToLanding() {
      this.page = 'landing';
    },
    handleLogin() {
      if (typeof this.onLogin === 'function') {
        this.onLogin();
      } else {
        console.error('Login handler is not defined', this.onLogin);
      }
    },
    handleRegister() {
      if (this.registerType === 'student') {
        if (typeof this.onRegisterStudent === 'function') {
          this.onRegisterStudent();
        } else {
          console.error('Student registration handler is not defined', this.onRegisterStudent);
        }
      } else {
        if (typeof this.onRegisterCompany === 'function') {
          this.onRegisterCompany();
        } else {
          console.error('Company registration handler is not defined', this.onRegisterCompany);
        }
      }
    },
  },
  template: `
    <div class="row justify-content-center w-100 py-5">
      <div class="col-12 col-sm-10 col-md-8 col-lg-5">
        <div class="card glass border-0 shadow-lg rounded-4 text-dark bg-white bg-opacity-95">
          <div class="card-body p-4 p-sm-5 text-center">
            
            <!-- Landing View -->
            <div v-if="page === 'landing'">
              <div class="mb-4">
                <h2 class="fw-bold mt-2 mb-1 text-primary">PlaceNow</h2>
                <p class="text-muted small">Centralized hub for Students, Recruiters, and Administrators</p>
              </div>
              <p class="text-secondary mb-4 small">
                A simple platform to manage campus recruitment drives, submit job applications, coordinate student profiles, and track interview schedules.
              </p>
              <div class="d-grid gap-2">
                <button class="btn btn-primary btn-lg" @click="goToLogin">Login to Account</button>
                <button class="btn btn-outline-primary btn-lg" @click="goToRegister">Create New Account</button>
              </div>
            </div>

            <!-- Login View -->
            <div v-else-if="page === 'login'">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="text-start">
                  <h4 class="fw-bold mb-0 text-primary">Login</h4>
                  <small class="text-muted">Access your account dashboard</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary" @click="backToLanding">Back</button>
              </div>
              <div class="text-start mb-3">
                <label class="form-label small fw-semibold">Email Address</label>
                <input v-model="state.login.email" class="form-control" placeholder="Enter your registered email" />
              </div>
              <div class="text-start mb-4">
                <label class="form-label small fw-semibold">Password</label>
                <input v-model="state.login.password" type="password" class="form-control" placeholder="Enter your password" />
              </div>
              <button class="btn btn-primary btn-lg w-100" @click="handleLogin">Sign In</button>
            </div>

            <!-- Register View -->
            <div v-else-if="page === 'register'">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="text-start">
                  <h4 class="fw-bold mb-0 text-primary">Register</h4>
                  <small class="text-muted">Join the placement portal</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary" @click="backToLanding">Back</button>
              </div>
              
              <div class="mb-4">
                <div class="btn-group w-100" role="group">
                  <button type="button" class="btn" :class="registerType === 'student' ? 'btn-primary' : 'btn-outline-primary'" @click="registerType = 'student'">Student</button>
                  <button type="button" class="btn" :class="registerType === 'company' ? 'btn-primary' : 'btn-outline-primary'" @click="registerType = 'company'">Company</button>
                </div>
              </div>

              <!-- Student registration fields -->
              <div v-if="registerType === 'student'" class="text-start">
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Email Address</label>
                  <input v-model="state.student.email" class="form-control" placeholder="e.g. name@gmail.com" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Password</label>
                  <input v-model="state.student.password" type="password" class="form-control" placeholder="Choose a password" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Full Name</label>
                  <input v-model="state.student.full_name" class="form-control" placeholder="Enter your full name" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Phone Number</label>
                  <input v-model="state.student.phone" class="form-control" placeholder="Enter your phone number" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Branch</label>
                  <input v-model="state.student.branch" class="form-control" placeholder="e.g. BTech, BA, BSc" />
                </div>
                <div class="row g-2 mb-4">
                  <div class="col">
                    <label class="form-label small fw-semibold mb-1">CGPA</label>
                    <input v-model="state.student.cgpa" type="number" step="0.01" min="0" max="10" class="form-control" placeholder="CGPA" />
                  </div>
                  <div class="col">
                    <label class="form-label small fw-semibold mb-1">Year of Study</label>
                    <input v-model="state.student.year" type="number" min="1" max="5" class="form-control" placeholder="Year" />
                  </div>
                </div>
              </div>

              <!-- Company registration fields -->
              <div v-if="registerType === 'company'" class="text-start">
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Corporate Email</label>
                  <input v-model="state.company.email" class="form-control" placeholder="e.g. companyname@placenow.in" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Password</label>
                  <input v-model="state.company.password" type="password" class="form-control" placeholder="Choose a password" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Company Name</label>
                  <input v-model="state.company.company_name" class="form-control" placeholder="e.g. Google India" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">HR Contact Number</label>
                  <input v-model="state.company.hr_contact" class="form-control" placeholder="Enter contact number" />
                </div>
                <div class="mb-2">
                  <label class="form-label small fw-semibold mb-1">Website URL</label>
                  <input v-model="state.company.website" class="form-control" placeholder="https://example.com" />
                </div>
                <div class="mb-4">
                  <label class="form-label small fw-semibold mb-1">Description</label>
                  <textarea v-model="state.company.description" class="form-control" rows="3" placeholder="Brief about the company..."></textarea>
                </div>
              </div>

              <button class="btn btn-success btn-lg w-100" @click="handleRegister">Register Account</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
};
