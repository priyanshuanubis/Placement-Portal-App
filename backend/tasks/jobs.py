import csv
import io
import json
import logging
import os
from datetime import date, timedelta
from email.message import EmailMessage
from urllib import request as urllib_request

from flask import current_app, has_app_context

from extensions import db
from models import Application, CompanyProfile, PlacementDrive, StudentProfile


def _send_webhook_or_email(subject, text_body, html_body=None):
    webhook_url = os.getenv("GOOGLE_CHAT_WEBHOOK_URL")
    if webhook_url:
        payload = json.dumps({"text": text_body}).encode("utf-8")
        req = urllib_request.Request(webhook_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib_request.urlopen(req, timeout=10):
            return "webhook"

    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ppa.local")
    if smtp_host and smtp_user and smtp_password:
        import smtplib

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = smtp_user
        message["To"] = admin_email
        message.set_content(text_body)
        if html_body:
            message.add_alternative(html_body, subtype="html")
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587"))) as server:
            if os.getenv("SMTP_STARTTLS", "1") == "1":
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(message)
        return "email"

    logger = current_app.logger if has_app_context() else logging.getLogger(__name__)
    logger.info("Notification not delivered externally: %s", text_body)
    return "local"


def export_student_history_csv(student_user_id):
    profile = StudentProfile.query.filter_by(user_id=student_user_id).first()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Company Name", "Drive Title", "Application Status", "Applied Date"])

    if profile:
        rows = (
            db.session.query(Application, PlacementDrive, CompanyProfile)
            .join(PlacementDrive, PlacementDrive.id == Application.drive_id)
            .join(CompanyProfile, CompanyProfile.id == PlacementDrive.company_id)
            .filter(Application.student_id == profile.id)
            .all()
        )
        for app, drive, company in rows:
            writer.writerow([profile.id, company.company_name, drive.job_title, app.status, app.application_date.isoformat()])

    memory = io.BytesIO(output.getvalue().encode("utf-8"))
    memory.seek(0)
    return memory


def daily_deadline_reminders():
    today = date.today()
    upcoming = today + timedelta(days=2)
    drives = PlacementDrive.query.filter(
        PlacementDrive.status == "approved",
        PlacementDrive.application_deadline >= today,
        PlacementDrive.application_deadline <= upcoming,
    ).all()

    if drives:
        lines = ["Daily placement reminder:"]
        for drive in drives:
            company = db.session.get(CompanyProfile, drive.company_id)
            lines.append(f"- {drive.job_title} at {company.company_name if company else 'Unknown'} closes on {drive.application_deadline.isoformat()}")
        body = "\n".join(lines)
    else:
        body = "Daily placement reminder: no upcoming deadlines in the next 2 days."

    delivery = _send_webhook_or_email("Placement reminders", body)
    return {"delivery": delivery, "drives": len(drives), "message": body}


def monthly_admin_report():
    month_start = date.today().replace(day=1)
    drives = PlacementDrive.query.filter(PlacementDrive.created_at >= month_start).count()
    applications = Application.query.filter(Application.application_date >= month_start).count()
    selected = Application.query.filter(Application.application_date >= month_start, Application.status == "selected").count()

    html_report = f"""
    <h2>Monthly Placement Activity Report</h2>
    <ul>
      <li>Total drives created: {drives}</li>
      <li>Total applications submitted: {applications}</li>
      <li>Total students selected: {selected}</li>
    </ul>
    """
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ppa.local")
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if smtp_host and smtp_user and smtp_password:
        import smtplib

        message = EmailMessage()
        message["Subject"] = "Monthly Placement Activity Report"
        message["From"] = smtp_user
        message["To"] = admin_email
        message.set_content(
            f"Monthly report generated: drives={drives}, applications={applications}, selected={selected}"
        )
        message.add_alternative(html_report, subtype="html")
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587"))) as server:
            if os.getenv("SMTP_STARTTLS", "1") == "1":
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(message)
        delivery = f"email:{admin_email}"
    else:
        delivery = _send_webhook_or_email(
            "Monthly Placement Activity Report",
            f"Monthly report generated: drives={drives}, applications={applications}, selected={selected}",
            html_body=html_report,
        )

    current_app.logger.info("Generated monthly report via %s", delivery)
    return html_report
