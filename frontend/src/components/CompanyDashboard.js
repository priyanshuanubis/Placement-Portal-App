export const CompanyDashboard = {
  props: ['state', 'companyPage', 'loadDashboard', 'loadDrives', 'loadApplications', 'createDrive', 'updateApplication'],
  template: `
    <div class="row g-3">
      <!-- 1. Dashboard Overview / Stats Page -->
      <div v-if="companyPage === 'stats'" class="col-md-8 mx-auto">
        <div class="card glass shadow-sm"><div class="card-body">
          <h4 class="mb-3">Welcome Back!</h4>
          <div class="d-flex gap-2 mb-3">
            <button class="btn btn-primary btn-sm" @click="loadDashboard">Refresh Data</button>
          </div>
          <div v-if="state.companyPanel.summary" class="mb-4">
            <p class="section-title mb-1">Company Profile</p>
            <h3 class="mb-1 text-primary">{{ state.companyPanel.summary.company.name }}</h3>
            <div class="fw-semibold text-muted mb-2">
              HR Contact: {{ state.companyPanel.summary.company.hr_contact }} · 
              Status: <span class="badge" :class="state.companyPanel.summary.company.approval_status === 'approved' ? 'bg-success' : 'bg-warning'">{{ state.companyPanel.summary.company.approval_status }}</span>
            </div>
            <div class="mb-3" v-if="state.companyPanel.summary.company.website">
              <strong>Website:</strong> <a :href="state.companyPanel.summary.company.website" target="_blank">{{ state.companyPanel.summary.company.website }}</a>
            </div>
            <p class="border-start border-3 border-primary ps-3 py-1 bg-light-subtle rounded">{{ state.companyPanel.summary.company.description || 'No description provided.' }}</p>
          </div>
          
          <p class="section-title mb-2">Statistics Summary</p>
          <div class="row g-3">
            <div class="col-6">
              <div class="bg-light-subtle border rounded p-3 text-center">
                <div class="section-title mb-1">Drives Created</div>
                <h2 class="mb-0 text-primary">{{ state.companyPanel.summary ? state.companyPanel.summary.drives_created : 0 }}</h2>
              </div>
            </div>
            <div class="col-6">
              <div class="bg-light-subtle border rounded p-3 text-center">
                <div class="section-title mb-1">Total Applicants</div>
                <h2 class="mb-0 text-success">{{ state.companyPanel.summary ? state.companyPanel.summary.total_applicants : 0 }}</h2>
              </div>
            </div>
          </div>
        </div></div>
      </div>

      <!-- 2. Create Drive Page -->
      <div v-if="companyPage === 'create_drive'" class="col-md-8 mx-auto">
        <div class="card glass shadow-sm"><div class="card-body">
          <p class="section-title mb-2">Create Placement Drive</p>
          <h5 class="mb-3">Specify Recruitment Eligibility and Details</h5>
          
          <div class="mb-3">
            <label class="form-label">Job Title</label>
            <input v-model="state.drive.job_title" class="form-control" placeholder="e.g. Software Engineer" />
          </div>
          <div class="mb-3">
            <label class="form-label">Job Description</label>
            <textarea v-model="state.drive.job_description" class="form-control" rows="4" placeholder="Describe roles and responsibilities..."></textarea>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label">Eligible Branch</label>
              <input v-model="state.drive.eligible_branch" class="form-control" placeholder="e.g. BTech, BA or Any" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Current year of study</label>
              <input v-model="state.drive.eligible_year" type="number" class="form-control" min="1" max="5" placeholder="e.g. 2 (for 2nd year and above)" />
            </div>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label">Min CGPA Required</label>
              <input v-model="state.drive.min_cgpa" type="number" step="0.01" class="form-control" placeholder="e.g. 7.5" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Application Deadline</label>
              <input v-model="state.drive.application_deadline" type="date" class="form-control" />
            </div>
          </div>
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <label class="form-label">Job Location</label>
              <input v-model="state.drive.location" class="form-control" placeholder="e.g. Bangalore, Remote" />
            </div>
            <div class="col-md-6">
              <label class="form-label">CTC (LPA)</label>
              <input v-model="state.drive.ctc_lpa" type="number" step="0.1" class="form-control" placeholder="e.g. 12" />
            </div>
          </div>
          <button class="btn btn-success w-100" @click="createDrive">Create Drive & Submit for Approval</button>
        </div></div>
      </div>

      <!-- 3. Placement Drives Page (Full Width) -->
      <div v-if="companyPage === 'drives'" class="col-12">
        <div class="card glass shadow-sm"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="section-title mb-1">Placement Drives</p>
              <h5>Created Job Opportunities</h5>
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="loadDrives">Refresh List</button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Job Title</th><th>Status</th><th>Applicants</th><th>Deadline</th></tr></thead>
              <tbody>
                <tr v-for="drive in state.companyPanel.drives" :key="drive.id">
                  <td class="fw-semibold">{{ drive.title }}</td>
                  <td>
                    <span class="badge" :class="drive.status === 'approved' ? 'bg-success' : drive.status === 'pending' ? 'bg-warning' : 'bg-secondary'">
                      {{ drive.status }}
                    </span>
                  </td>
                  <td><span class="badge bg-light text-dark border">{{ drive.applicants }}</span></td>
                  <td>{{ drive.deadline }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>

      <!-- 4. Applicants Page (Full Width) -->
      <div v-if="companyPage === 'applicants'" class="col-12">
        <div class="card glass shadow-sm"><div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="section-title mb-1">Student Applicants</p>
              <h5>Manage Student Recruitment Pipelines</h5>
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="loadApplications">Refresh List</button>
          </div>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Student</th><th>Applied Drive</th><th>Status</th><th>Interview Date</th><th>Status Actions & Remarks</th></tr></thead>
              <tbody>
                <tr v-for="application in state.companyPanel.applications" :key="application.application_id">
                  <td>
                    <div class="fw-semibold">{{ application.student }}</div>
                    <div class="small-muted">{{ application.student_branch }} · CGPA {{ application.student_cgpa }}</div>
                  </td>
                  <td class="fw-semibold">{{ application.drive }}</td>
                  <td>
                    <span class="badge" :class="application.status === 'selected' ? 'bg-success' : application.status === 'rejected' ? 'bg-danger' : application.status === 'applied' ? 'bg-info' : 'bg-primary'">
                      {{ application.status.replace('_', ' ') }}
                    </span>
                  </td>
                  <td>{{ application.interview_at ? application.interview_at.replace('T', ' ') : 'Not scheduled' }}</td>
                  <td style="min-width: 320px;">
                    <div class="d-flex flex-wrap gap-1 mb-2">
                      <button class="btn btn-outline-secondary btn-sm" @click="updateApplication(application.application_id, 'shortlisted')">Shortlist</button>
                      <button class="btn btn-outline-primary btn-sm" @click="updateApplication(application.application_id, 'interview_scheduled')">Schedule Interview</button>
                      <button class="btn btn-outline-success btn-sm" @click="updateApplication(application.application_id, 'selected')">Select</button>
                      <button class="btn btn-outline-danger btn-sm" @click="updateApplication(application.application_id, 'rejected')">Reject</button>
                    </div>
                    <div class="row g-2">
                      <div class="col-6">
                        <input class="form-control form-control-sm" type="datetime-local" :value="application.interview_at" @change="updateApplication(application.application_id, application.status, $event.target.value, application.remarks)" />
                      </div>
                      <div class="col-6">
                        <input class="form-control form-control-sm" :value="application.remarks || ''" placeholder="Remarks" @change="updateApplication(application.application_id, application.status, application.interview_at, $event.target.value)" />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div></div>
      </div>
    </div>
  `,
};
