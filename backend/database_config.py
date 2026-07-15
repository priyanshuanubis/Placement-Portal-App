from extensions import db
from models import seed_admin_user


def create_tables():
    db.create_all()


def create_administrator():
    return seed_admin_user()