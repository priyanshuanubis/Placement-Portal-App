export const StudentDashboard = {
  props: ['state', 'studentPage', 'loadStudentDashboard', 'loadStudentProfile', 'loadStudentCompanies', 'saveStudentProfile', 'uploadResume', 'loadStudentDrives', 'loadApplications', 'applyDrive', 'exportCsv'],
  template: `
    <div class="row g-3">
      <!-- 1. Dashboard Overview / Stats Page -->
      <template v-if="studentPage === 'stats'">
        <div class="col-md-5">
          <div class="card glass shadow-sm h-100"><div class="card-body">
            <h4 class="mb-3">Welcome, {{ state.studentPanel.summary ? state.studentPanel.summary.name : 'Student' }}!</h4>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <button class="btn btn-primary btn-sm" @click="loadStudentDashboard">Refresh Stats</button>
              <button class="btn btn-outline-dark btn-sm" @click="exportCsv">Export CSV</button>
            </div>
            <div v-if="state.studentPanel.summary" class="mb-3">
              <p class="section-title mb-2">My Information</p>
              <div class="mb-2"><strong>Branch:</strong> {{ state.studentPanel.summary.branch }}</div>
              <div class="mb-2"><strong>CGPA:</strong> {{ state.studentPanel.summary.cgpa }}</div>
              <div class="mb-2"><strong>Year:</strong> {{ state.studentPanel.summary.year }}</div>
              
              <p class="section-title mb-2 mt-4">Applications Status</p>
              <div class="mb-2 text-primary"><strong>Total Applied:</strong> {{ state.studentPanel.summary.applied_count }}</div>
              <div class="mb-2 text-success"><strong>Total Selected:</strong> {{ state.studentPanel.summary.selected_count }}</div>
              
              <div class="mt-3" v-if="state.studentPanel.summary.resume_link">
                <strong>Current Resume:</strong> <a :href="state.studentPanel.summary.resume_link" target="_blank" class="small">{{ state.studentPanel.summary.resume_link }}</a>
              </div>
            </div>
          </div></div>
        </div>

        <div class="col-md-7">
          <div class="card glass shadow-sm h-100"><div class="card-body">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <p class="section-title mb-1">Approved Companies</p>
              </div>
              <div class="d-flex gap-2">
                <input v-model="state.studentPanel.companySearch" class="form-control form-control-sm" placeholder="Search companies" />
                <button class="btn btn-primary btn-sm" @click="loadStudentCompanies">Search</button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead><tr><th>Company</th><th>HR Contact</th><th>Website</th><th>Description</th></tr></thead>
                <tbody>
                  <tr v-for="company in state.studentPanel.companies" :key="company.company_id">
                    <td class="fw-semibold">{{ company.company_name }}</td>
                    <td>{{ company.hr_contact }}</td>
                    <td>{{ company.website || 'N/A' }}</td>
                    <td>{{ company.description || 'N/A' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div></div>
        </div>
      </template>

      <!-- 2. Placement Drives Page (Full Width) -->
      <div v-if="studentPage === 'drives'" class="col-12">
        <div class="card glass shadow-sm"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <p class="section-title mb-1">Placement Drives</p>
              <h5>All Available and Past Drives</h5>
            </div>
            <div class="d-flex gap-2">
              <input v-model="state.studentPanel.search" class="form-control form-control-sm" placeholder="Search drives" />
              <button class="btn btn-primary btn-sm" @click="loadStudentDrives">Search Drives</button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Company</th><th>Role</th><th>Deadline</th><th>CTC (LPA)</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="d in state.studentPanel.drives" :key="d.drive_id">
                  <td>
                    <div class="fw-semibold">{{ d.company }}</div>
                    <div class="small-muted">{{ d.location || 'Location NA' }}</div>
                  </td>
                  <td>
                    <div class="fw-semibold">{{ d.job_title }}</div>
                    <div class="small-muted">{{ d.job_description }}</div>
                    <div class="small-muted mt-1">Min CGPA: {{ d.min_cgpa }}, Year: {{ d.eligible_year }}+</div>
                  </td>
                  <td>{{ d.deadline }}</td>
                  <td>{{ d.ctc_lpa || 'N/A' }}</td>
                  <td>
                    <button
                      class="btn btn-sm"
                      style="width: 130px;"
                      :class="d.already_applied ? 'btn-success' : d.deadline_passed ? 'btn-secondary' : 'btn-success'"
                      :disabled="d.already_applied || d.deadline_passed"
                      @click="applyDrive(d.drive_id)">
                      {{ d.already_applied ? 'Applied' : d.deadline_passed ? 'Deadline passed' : 'Apply' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>

      <!-- 3. My Applications Page (Full Width) -->
      <div v-if="studentPage === 'applications'" class="col-12">
        <div class="card glass shadow-sm"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="section-title mb-1">My Applications</p>
              <h5>Your Placement Drive Application History</h5>
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="loadApplications">Refresh List</button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Company</th><th>Drive</th><th>Status</th><th>Applied On</th></tr></thead>
              <tbody>
                <tr v-for="application in state.studentPanel.applications" :key="application.application_id">
                  <td>{{ application.company }}</td>
                  <td>{{ application.drive }}</td>
                  <td><span class="badge" :class="application.status === 'selected' ? 'bg-success' : application.status === 'rejected' ? 'bg-danger' : 'bg-secondary'">{{ application.status }}</span></td>
                  <td>{{ application.applied_on }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>

      <!-- 4. Edit Profile Page -->
      <div v-if="studentPage === 'profile'" class="col-md-8 mx-auto">
        <div class="card glass shadow-sm"><div class="card-body">
          <p class="section-title mb-2">Update Profile Details</p>
          <div class="d-flex gap-2 mb-3">
            <button class="btn btn-outline-primary btn-sm" @click="loadStudentProfile">Reload Current Profile</button>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full Name</label>
              <input v-model="state.profileForm.full_name" class="form-control" placeholder="Full name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Phone Number</label>
              <input v-model="state.profileForm.phone" class="form-control" placeholder="Phone" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Branch</label>
              <input v-model="state.profileForm.branch" class="form-control" placeholder="Branch" />
            </div>
            <div class="col-md-3">
              <label class="form-label">CGPA</label>
              <input v-model="state.profileForm.cgpa" class="form-control" type="number" step="0.01" min="0" max="10" placeholder="CGPA" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Academic Year</label>
              <input v-model="state.profileForm.year" class="form-control" type="number" min="1" placeholder="Year" />
            </div>
            <div class="col-12">
              <label class="form-label">Resume Link (optional)</label>
              <input v-model="state.profileForm.resume_link" class="form-control" placeholder="Resume link (optional)" />
            </div>
            <div class="col-12 mt-2">
              <button class="btn btn-success w-100" @click="saveStudentProfile">Save Profile Changes</button>
            </div>
          </div>
          <hr class="my-4" />
          <div class="bg-light-subtle p-3 border rounded">
            <div class="section-title mb-2">Upload Resume File</div>
            <input class="form-control mb-2" type="file" accept=".pdf,.doc,.docx" @change="uploadResume($event.target.files[0])" />
            <div v-if="state.studentPanel.profile && state.studentPanel.profile.resume_link" class="small text-muted mt-1">Current resume filename/URL: <code>{{ state.studentPanel.profile.resume_link }}</code></div>
          </div>
        </div></div>
      </div>
    </div>
  `,
};
