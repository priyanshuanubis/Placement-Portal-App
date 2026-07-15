export const AdminDashboard = {
  props: ['state', 'adminPage', 'reloadStats', 'loadCompanies', 'loadDrives', 'loadStudents', 'loadApplications', 'search', 'updateCompanyStatus', 'updateDriveStatus', 'toggleUserActive'],
  template: `
    <div class="row g-3">
      <!-- 1. Stats Dashboard Page -->
      <div v-if="adminPage === 'stats'" class="col-12">
        <div class="card glass shadow-sm"><div class="card-body">
          <div class="d-flex flex-wrap gap-2 mb-3">
            <button class="btn btn-primary" @click="reloadStats">Refresh Stats</button>
            <button class="btn btn-outline-warning" @click="$emit('send-reminders')">Send Reminders</button>
            <button class="btn btn-outline-info" @click="$emit('generate-report')">Monthly Report</button>
            <input v-model="state.admin.q" class="form-control flex-grow-1" placeholder="Search companies, students or drives" />
            <button class="btn btn-dark" @click="search">Search</button>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-3" v-for="(v,k) in state.admin.stats" :key="k">
              <div class="card border-0 bg-light h-100"><div class="card-body">
                <p class="section-title mb-1">{{ k.replaceAll('_', ' ') }}</p>
                <h3 class="mb-0">{{ v }}</h3>
              </div></div>
            </div>
          </div>
          <div v-if="state.admin.searchResults" class="border rounded p-3 bg-light-subtle">
            <h6 class="mb-3">Search Results</h6>
            <div class="row g-3">
              <div class="col-md-4">
                <p class="section-title mb-2">Students</p>
                <div v-for="item in state.admin.searchResults.students" :key="item.id" class="small mb-2">{{ item.name }} - {{ item.branch }} <span class="text-muted">({{ item.active ? 'active' : 'inactive' }})</span></div>
              </div>
              <div class="col-md-4">
                <p class="section-title mb-2">Companies</p>
                <div v-for="item in state.admin.searchResults.companies" :key="item.id" class="small mb-2">{{ item.name }} - {{ item.status }}</div>
              </div>
              <div class="col-md-4">
                <p class="section-title mb-2">Drives</p>
                <div v-for="item in state.admin.searchResults.drives" :key="item.id" class="small mb-2">{{ item.title }} - {{ item.status }}</div>
              </div>
            </div>
          </div>
        </div></div>
      </div>

      <!-- 2. Companies & Drives Page -->
      <template v-if="adminPage === 'companies_drives'">
        <div class="col-lg-6">
          <div class="card glass shadow-sm h-100"><div class="card-body">
            <p class="section-title mb-2">Companies</p>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="company in state.admin.companies" :key="company.company_id">
                    <td>
                      <div class="fw-semibold">{{ company.name }}</div>
                      <div class="small-muted">{{ company.hr_contact }}</div>
                    </td>
                    <td>{{ company.approval_status }}</td>
                    <td class="d-flex gap-1 flex-wrap">
                      <button class="btn btn-success btn-sm" @click="updateCompanyStatus(company.company_id, 'approved')">Approve</button>
                      <button class="btn btn-warning btn-sm" @click="updateCompanyStatus(company.company_id, 'rejected')">Reject</button>
                      <button class="btn btn-danger btn-sm" @click="updateCompanyStatus(company.company_id, 'blacklisted')">Blacklist</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div></div>
        </div>

        <div class="col-lg-6">
          <div class="card glass shadow-sm h-100"><div class="card-body">
            <p class="section-title mb-2">Placement Drives</p>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead><tr><th>Title</th><th>Company</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="drive in state.admin.drives" :key="drive.drive_id">
                    <td>{{ drive.title }}</td>
                    <td>{{ drive.company_name }}</td>
                    <td>{{ drive.status }}</td>
                    <td class="d-flex gap-1 flex-wrap">
                      <button class="btn btn-success btn-sm" @click="updateDriveStatus(drive.drive_id, 'approved')">Approve</button>
                      <button class="btn btn-warning btn-sm" @click="updateDriveStatus(drive.drive_id, 'rejected')">Reject</button>
                      <button class="btn btn-secondary btn-sm" @click="updateDriveStatus(drive.drive_id, 'closed')">Close</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div></div>
        </div>
      </template>

      <!-- 3. Students Page (Expanded to Full Width) -->
      <div v-if="adminPage === 'students'" class="col-12">
        <div class="card glass shadow-sm h-100"><div class="card-body">
          <p class="section-title mb-2">Students</p>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Name</th><th>Branch</th><th>CGPA</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="student in state.admin.students" :key="student.student_id">
                  <td>{{ student.full_name }}</td>
                  <td>{{ student.branch }}</td>
                  <td>{{ student.cgpa }}</td>
                  <td>
                    <button class="btn btn-outline-danger btn-sm" v-if="student.active" @click="toggleUserActive(student.user_id, false)">Deactivate</button>
                    <button class="btn btn-outline-success btn-sm" v-else @click="toggleUserActive(student.user_id, true)">Activate</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>

      <!-- 4. Applications Page (Expanded to Full Width) -->
      <div v-if="adminPage === 'applications'" class="col-12">
        <div class="card glass shadow-sm h-100"><div class="card-body">
          <p class="section-title mb-2">Applications</p>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Student</th><th>Drive</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="application in state.admin.applications" :key="application.application_id">
                  <td>{{ application.student }}</td>
                  <td>{{ application.drive }}</td>
                  <td>{{ application.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>
    </div>
  `,
};
