import io
import os
from datetime import date
from pathlib import Path

from celery.result import AsyncResult
from flask import Blueprint, current_app, jsonify, request, send_file
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from extensions import cache, db
from models import Application, CompanyProfile, PlacementDrive, StudentProfile, UserRole
from routes.utils import role_required
from tasks.celery_app import export_student_history
from tasks.jobs import export_student_history_csv

bp = Blueprint("student", __name__, url_prefix="/api/student")


@bp.get("/dashboard")
@role_required(UserRole.STUDENT.value)
def dashboard(current_user):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    apps = Application.query.filter_by(student_id=profile.id).all()
    return jsonify(
        {
            "name": profile.full_name,
            "branch": profile.branch,
            "cgpa": profile.cgpa,
            "year": profile.year,
            "phone": profile.phone,
            "resume_link": profile.resume_link,
            "applied_count": len(apps),
            "selected_count": sum(1 for app in apps if app.status == "selected"),
            "history_count": len(apps),
        }
    )


@bp.get("/profile")
@role_required(UserRole.STUDENT.value)
def profile(current_user):
    student = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({"message": "Student profile missing"}), 404

    return jsonify(
        {
            "id": student.id,
            "full_name": student.full_name,
            "phone": student.phone,
            "branch": student.branch,
            "cgpa": student.cgpa,
            "year": student.year,
            "resume_link": student.resume_link,
        }
    )


def make_student_drives_key():
    from flask_jwt_extended import get_jwt_identity
    identity = get_jwt_identity() or "guest"
    q = request.args.get("q", "").strip()
    return f"student_drives:{identity}:{q}"


@bp.get("/drives")
@role_required(UserRole.STUDENT.value)
@cache.cached(timeout=60, key_prefix=make_student_drives_key)
def eligible_drives(current_user):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    applied_drive_ids = {app.drive_id for app in Application.query.filter_by(student_id=profile.id).all()}
    q = request.args.get("q", "").strip()
    drive_query = (
        db.session.query(PlacementDrive, CompanyProfile)
        .join(CompanyProfile, CompanyProfile.id == PlacementDrive.company_id)
        .filter(
            PlacementDrive.status == "approved",
            or_(
                PlacementDrive.eligible_branch.ilike(f"%{profile.branch}%"),
                PlacementDrive.eligible_branch.ilike("any")
            ),
        )
    )
    if q:
        drive_query = drive_query.filter(
            or_(
                PlacementDrive.job_title.ilike(f"%{q}%"),
                PlacementDrive.job_description.ilike(f"%{q}%"),
                CompanyProfile.company_name.ilike(f"%{q}%"),
            )
        )
    rows = drive_query.all()
    return jsonify(
        [
            {
                "drive_id": drive.id,
                "company": company.company_name,
                "job_title": drive.job_title,
                "job_description": drive.job_description,
                "deadline": drive.application_deadline.isoformat(),
                "location": drive.location,
                "ctc_lpa": drive.ctc_lpa,
                "min_cgpa": drive.min_cgpa,
                "eligible_year": drive.eligible_year,
                "eligible": profile.year >= drive.eligible_year and profile.cgpa >= drive.min_cgpa,
                "already_applied": drive.id in applied_drive_ids,
                "deadline_passed": drive.application_deadline < date.today(),
            }
            for drive, company in rows
        ]
    )


@bp.get("/companies")
@role_required(UserRole.STUDENT.value)
@cache.cached(timeout=60, query_string=True)
def approved_companies(current_user):
    q = request.args.get("q", "").strip()
    query = CompanyProfile.query.filter(CompanyProfile.approval_status == "approved")
    if q:
        query = query.filter(
            or_(
                CompanyProfile.company_name.ilike(f"%{q}%"),
                CompanyProfile.hr_contact.ilike(f"%{q}%"),
                CompanyProfile.website.ilike(f"%{q}%"),
                CompanyProfile.description.ilike(f"%{q}%"),
            )
        )

    companies = query.order_by(CompanyProfile.company_name.asc()).all()
    return jsonify(
        [
            {
                "company_id": company.id,
                "company_name": company.company_name,
                "hr_contact": company.hr_contact,
                "website": company.website,
                "description": company.description,
            }
            for company in companies
        ]
    )


@bp.post("/drives/<int:drive_id>/apply")
@role_required(UserRole.STUDENT.value)
def apply_drive(current_user, drive_id):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    drive = db.session.get(PlacementDrive, drive_id)
    if not drive:
        return jsonify({"message": "Drive not found"}), 404
    if drive.status != "approved":
        return jsonify({"message": "Drive is not open for applications"}), 400
    if drive.application_deadline < date.today():
        return jsonify({"message": "Application deadline is over"}), 400

    eligible = (
        profile.year >= drive.eligible_year
        and profile.cgpa >= drive.min_cgpa
        and (
            profile.branch.lower() in drive.eligible_branch.lower()
            or drive.eligible_branch.strip().lower() == "any"
        )
    )
    if not eligible:
        return jsonify({"message": "You are not eligible for this drive"}), 400

    already_applied = Application.query.filter_by(student_id=profile.id, drive_id=drive.id).first()
    if already_applied:
        return jsonify({"message": "You have already applied"}), 400

    application = Application(student_id=profile.id, drive_id=drive.id)
    db.session.add(application)
    db.session.commit()
    return jsonify({"message": "Application submitted successfully"}), 201


@bp.get("/applications")
@role_required(UserRole.STUDENT.value)
def my_applications(current_user):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    rows = (
        db.session.query(Application, PlacementDrive, CompanyProfile)
        .join(PlacementDrive, PlacementDrive.id == Application.drive_id)
        .join(CompanyProfile, CompanyProfile.id == PlacementDrive.company_id)
        .filter(Application.student_id == profile.id)
        .all()
    )
    return jsonify(
        [
            {
                "application_id": app.id,
                "company": company.company_name,
                "drive": drive.job_title,
                "status": app.status,
                "interview_at": app.interview_at.isoformat() if app.interview_at else None,
                "applied_on": app.application_date.isoformat(),
            }
            for app, drive, company in rows
        ]
    )


@bp.get("/export")
@role_required(UserRole.STUDENT.value)
def export_csv(current_user):
    csv_text = export_student_history_csv(current_user.id)
    return send_file(
        csv_text,
        as_attachment=True,
        download_name="application_history.csv",
        mimetype="text/csv",
    )


@bp.post("/resume")
@role_required(UserRole.STUDENT.value)
def upload_resume(current_user):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    uploaded = request.files.get("resume")
    if not uploaded or not uploaded.filename:
        return jsonify({"message": "Resume file is required"}), 400

    filename = secure_filename(uploaded.filename)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"pdf", "doc", "docx"}:
        return jsonify({"message": "Unsupported resume type"}), 400

    resume_dir = Path(current_app.config["UPLOAD_FOLDER"]) / "resumes"
    resume_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"student-{profile.id}-resume.{extension}"
    file_path = resume_dir / stored_name
    uploaded.save(file_path)
    profile.resume_link = f"/uploads/resumes/{stored_name}"
    db.session.commit()

    return jsonify({"message": "Resume uploaded successfully", "resume_link": profile.resume_link})


@bp.post("/export/request")
@role_required(UserRole.STUDENT.value)
def request_export(current_user):
    if os.getenv("CELERY_TASK_ALWAYS_EAGER", "1") == "1":
        csv_text = export_student_history_csv(current_user.id)
        task_id = f"local-{current_user.id}"
        return jsonify({"task_id": task_id, "status": "SUCCESS", "download_ready": True, "csv": csv_text.getvalue().decode("utf-8")})

    task = export_student_history.delay(current_user.id)
    return jsonify({"task_id": task.id, "status": task.status, "download_ready": False})


@bp.get("/export/status/<task_id>")
@role_required(UserRole.STUDENT.value)
def export_status(_current_user, task_id):
    if task_id.startswith("local-"):
        return jsonify({"task_id": task_id, "status": "SUCCESS", "download_ready": True})

    task = AsyncResult(task_id, app=export_student_history.app)
    payload = {"task_id": task.id, "status": task.status, "download_ready": task.successful()}
    if task.successful():
        payload["csv"] = task.result
    return jsonify(payload)


@bp.get("/export/download/<task_id>")
@role_required(UserRole.STUDENT.value)
def export_download(current_user, task_id):
    if task_id.startswith("local-"):
        csv_content = export_student_history_csv(current_user.id).getvalue().decode("utf-8")
    else:
        task = AsyncResult(task_id, app=export_student_history.app)
        if not task.successful():
            return jsonify({"message": "Export is not ready yet"}), 400
        csv_content = task.result

    return send_file(
        io.BytesIO(csv_content.encode("utf-8")),
        as_attachment=True,
        download_name="application_history.csv",
        mimetype="text/csv",
    )


@bp.patch("/profile")
@role_required(UserRole.STUDENT.value)
def update_profile(current_user):
    profile = StudentProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"message": "Student profile missing"}), 404

    payload = request.get_json(force=True)
    for field in ["full_name", "phone", "branch", "resume_link"]:
        if field in payload:
            setattr(profile, field, payload[field])
    if "cgpa" in payload:
        profile.cgpa = float(payload["cgpa"])
    if "year" in payload:
        profile.year = int(payload["year"])

    db.session.commit()
    return jsonify({"message": "Profile updated"})
