import os
from flask import Flask

from config import DevConfig
from database_config import create_administrator, create_tables
from extensions import db

app = Flask(__name__)

app.config.from_object(DevConfig)

db.init_app(app)

with app.app_context():
    create_tables()
    create_administrator()

    from pathlib import Path
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    app.run(debug=True)
