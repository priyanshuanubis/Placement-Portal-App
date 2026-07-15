import os
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS

from config import DevConfig
from database_config import create_administrator, create_tables
from extensions import db, jwt
from routes.auth_routes import auth_routes
from routes.user_routes import user_routes
from routes.admin_routes import admin_routes
from routes.company_routes import company_routes

app = Flask(
    __name__,
    template_folder="../frontend",
    static_folder="../frontend",
    static_url_path="/frontend",
)

app.config.from_object(DevConfig)

CORS(app, supports_credentials=True)

db.init_app(app)
jwt.init_app(app)

app.register_blueprint(auth_routes, url_prefix="/api/auth")
app.register_blueprint(user_routes, url_prefix="/api/user")
app.register_blueprint(admin_routes, url_prefix="/api/admin")
app.register_blueprint(company_routes, url_prefix="/api/company")


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


with app.app_context():
    create_tables()
    create_administrator()

    from pathlib import Path
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith(("api", "auth", "user", "admin", "company", "student", "frontend")):
        return {"message": "not found"}, 404
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
