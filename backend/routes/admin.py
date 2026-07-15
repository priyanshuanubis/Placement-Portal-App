from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from extensions import db
from models import Application, ApprovalStatus, CompanyProfile, PlacementDrive, StudentProfile, User, UserRole
from routes.utils import role_required

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/dashboard")
@role_required(UserRole.ADMIN.value)
def dashboard(_user):
    return jsonify(
        {
            "students": User.query.filter_by(role=UserRole.STUDENT.value).count(),
            "companies": User.query.filter_by(role=UserRole.COMPANY.value).count(),
            "drives": PlacementDrive.query.count(),
            "applications": Application.query.count(),
            "selected": Application.query.filter_by(status="selected").count(),
            "pending_companies": CompanyProfile.query.filter_by(approval_status=ApprovalStatus.PENDING.value).count(),
            "pending_drives": PlacementDrive.query.filter_by(status=ApprovalStatus.PENDING.value).count(),
        }
    )


@bp.get("/companies")
@role_required(UserRole.ADMIN.value)
def list_companies(_user):
    rows = db.session.query(User, CompanyProfile).join(CompanyProfile, CompanyProfile.user_id == User.id).all()
    return jsonify(
        [
            {
                "user_id": user.id,
                "company_id": company.id,
                "name": company.company_name,
                "hr_contact": company.hr_contact,
                "website": company.website,
                "description": company.description,
                "approval_status": company.approval_status,
                "active": user.active,
            }
            for user, company in rows
        ]
    )


@bp.patch("/companies/<int:company_id>/status")
@role_required(UserRole.ADMIN.value)
def approve_company(_user, company_id):
    payload = request.get_json(force=True)
    company = db.session.get(CompanyProfile, company_id)
    if not company:
        return jsonify({"message": "Company not found"}), 404

    status = payload.get("status", company.approval_status)
    allowed = {
        ApprovalStatus.PENDING.value,
        ApprovalStatus.APPROVED.value,
        ApprovalStatus.REJECTED.value,
        ApprovalStatus.BLACKLISTED.value,
    }
    if status not in allowed:
        return jsonify({"message": "Invalid status"}), 400

    company.approval_status = status
    owner = db.session.get(User, company.user_id)
    if owner:
        owner.active = status not in {ApprovalStatus.BLACKLISTED.value, ApprovalStatus.REJECTED.value}
    if company.approval_status in {ApprovalStatus.BLACKLISTED.value, ApprovalStatus.REJECTED.value}:
        drives = PlacementDrive.query.filter_by(company_id=company.id).all()
        for drive in drives:
            drive.status = ApprovalStatus.CLOSED.value
    db.session.commit()
    return jsonify({"message": "Company status updated"})


@bp.get("/drives")
@role_required(UserRole.ADMIN.value)
def list_drives(_user):
    rows = db.session.query(PlacementDrive, CompanyProfile).join(CompanyProfile, CompanyProfile.id == PlacementDrive.company_id).all()
    return jsonify(
        [
            {
                "drive_id": drive.id,
                "company_id": company.id,
                "company_name": company.company_name,
                "title": drive.job_title,
                "status": drive.status,
                "deadline": drive.application_deadline.isoformat(),
            }
            for drive, company in rows
        ]
    )


@bp.patch("/drives/<int:drive_id>/status")
@role_required(UserRole.ADMIN.value)
def approve_drive(_user, drive_id):
    payload = request.get_json(force=True)
    drive = db.session.get(PlacementDrive, drive_id)
    if not drive:
        return jsonify({"message": "Drive not found"}), 404

    status = payload.get("status", drive.status)
    allowed = {
        ApprovalStatus.PENDING.value,
        ApprovalStatus.APPROVED.value,
        ApprovalStatus.REJECTED.value,
        ApprovalStatus.CLOSED.value,
    }
    if status not in allowed:
        return jsonify({"message": "Invalid status"}), 400

    drive.status = status
    db.session.commit()
    return jsonify({"message": "Drive status updated"})


@bp.get("/students")
@role_required(UserRole.ADMIN.value)
def list_students(_user):
    rows = db.session.query(User, StudentProfile).join(StudentProfile, StudentProfile.user_id == User.id).all()
    return jsonify(
        [
            {
                "user_id": user.id,
                "student_id": student.id,
                "full_name": student.full_name,
                "branch": student.branch,
                "year": student.year,
                "cgpa": student.cgpa,
                "resume_link": student.resume_link,
                "active": user.active,
            }
            for user, student in rows
        ]
    )


@bp.patch("/users/<int:user_id>/active")
@role_required(UserRole.ADMIN.value)
def toggle_user(_user, user_id):
    payload = request.get_json(force=True)
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    user.active = bool(payload.get("active", user.active))
    db.session.commit()
    return jsonify({"message": "User status updated"})


@bp.get("/search")
@role_required(UserRole.ADMIN.value)
def search(_user):
    q = request.args.get("q", "").strip()
    students = (
        db.session.query(User, StudentProfile)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .filter(StudentProfile.full_name.ilike(f"%{q}%"))
        .all()
    )
    companies = (
        db.session.query(User, CompanyProfile)
        .join(CompanyProfile, CompanyProfile.user_id == User.id)
        .filter(CompanyProfile.company_name.ilike(f"%{q}%"))
        .all()
    )
    drive_query = PlacementDrive.query
    if q:
        drive_query = drive_query.join(CompanyProfile, CompanyProfile.id == PlacementDrive.company_id).filter(
            or_(
                PlacementDrive.job_title.ilike(f"%{q}%"),
                PlacementDrive.job_description.ilike(f"%{q}%"),
                CompanyProfile.company_name.ilike(f"%{q}%"),
            )
        )
    drives = drive_query.all()

    return jsonify(
        {
            "students": [{"id": s.id, "name": s.full_name, "branch": s.branch, "active": u.active} for u, s in students],
            "companies": [{"id": c.id, "name": c.company_name, "status": c.approval_status, "active": u.active} for u, c in companies],
            "drives": [{"id": d.id, "title": d.job_title, "status": d.status} for d in drives],
        }
    )


@bp.get("/applications")
@role_required(UserRole.ADMIN.value)
def list_applications(_user):
    rows = (
        db.session.query(Application, StudentProfile, PlacementDrive)
        .join(StudentProfile, StudentProfile.id == Application.student_id)
        .join(PlacementDrive, PlacementDrive.id == Application.drive_id)
        .all()
    )
    return jsonify(
        [
            {
                "application_id": app.id,
                "student": student.full_name,
                "branch": student.branch,
                "drive": drive.job_title,
                "company_id": drive.company_id,
                "status": app.status,
                "interview_at": app.interview_at.isoformat() if app.interview_at else None,
                "remarks": app.remarks,
                "applied_on": app.application_date.isoformat(),
            }
            for app, student, drive in rows
        ]
    )


@bp.post("/reminders")
@role_required(UserRole.ADMIN.value)
def send_reminders(_user):
    return jsonify({"message": "Reminder service not yet configured"})


@bp.post("/report")
@role_required(UserRole.ADMIN.value)
def generate_report(_user):
    return jsonify({"message": "Report service not yet configured"})
