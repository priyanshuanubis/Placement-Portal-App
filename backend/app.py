import os
from datetime import timedelta
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from flask_session import Session
import redis

from database_config import create_administrator, create_tables
from config import DevConfig
from extensions import db, jwt
from routes.admin_routes import admin_routes
from routes.auth_routes import auth_routes
from routes.company_routes import company_routes
from routes.student_routes import student_routes
from routes.user_routes import user_routes

app = Flask(
    __name__,
    template_folder="../frontend",
    static_folder="../frontend",
    static_url_path="/frontend",
)

app.config.from_object(DevConfig)

CORS(app, supports_credentials=True)

app.secret_key = "placement_portal_secret_key"

app.config["SESSION_TYPE"] = "redis"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_REDIS"] = redis.Redis(host="localhost", port=6379)

if os.getenv("REDIS_DISABLED", "0") == "1":
    app.config["CACHE_TYPE"] = "SimpleCache"
else:
    try:
        redis_client = redis.Redis.from_url(app.config["REDIS_URL"], socket_connect_timeout=1)
        redis_client.ping()
        app.config["CACHE_TYPE"] = "RedisCache"
    except Exception:
        app.config["CACHE_TYPE"] = "SimpleCache"
        app.config["CACHE_REDIS_URL"] = None

Session(app)

db.init_app(app)
jwt.init_app(app)


app.register_blueprint(auth_routes, url_prefix="/api/auth")
app.register_blueprint(user_routes, url_prefix="/api/user")
app.register_blueprint(admin_routes, url_prefix="/api/admin")
app.register_blueprint(company_routes, url_prefix="/api/company")
app.register_blueprint(student_routes, url_prefix="/api/student")

@app.route('/api/init', methods=['POST'])
def init_app():
    with app.app_context():
        create_tables()
        create_administrator()
    return {"message": "Database initialized and administrator created"}

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
