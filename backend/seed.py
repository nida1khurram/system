"""
Demo data seed - Run: python seed.py
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from models.models import Base, Class
from config import settings

DEMO_CLASSES = [
    {"name": "Nursery",  "grade": "Nursery", "section": "A"},
    {"name": "KG",       "grade": "KG",      "section": "A"},
    {"name": "Prep",     "grade": "Prep",    "section": "A"},
    {"name": "Class 1",  "grade": "1",       "section": "A"},
    {"name": "Class 2",  "grade": "2",       "section": "A"},
    {"name": "Class 3",  "grade": "3",       "section": "A"},
    {"name": "Class 4",  "grade": "4",       "section": "A"},
    {"name": "Class 5",  "grade": "5",       "section": "A"},
    {"name": "Class 6",  "grade": "6",       "section": "A"},
    {"name": "Class 7",  "grade": "7",       "section": "A"},
    {"name": "Class 8",  "grade": "8",       "section": "A"},
    {"name": "Class 9",  "grade": "9",       "section": "A"},
    {"name": "Class 10 (Matric)", "grade": "10", "section": "A"},
]

def seed():
    engine = create_engine(settings.DATABASE_URL, echo=True)
    Base.metadata.create_all(engine)

    # Add fee_type column to fee_invoices if it doesn't exist yet
    inspector = inspect(engine)
    existing_cols = [col["name"] for col in inspector.get_columns("fee_invoices")]
    if "fee_type" not in existing_cols:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE fee_invoices ADD COLUMN fee_type VARCHAR(20) NULL"))
            conn.commit()
        print("\nMigration: added fee_type column to fee_invoices")

    Session = sessionmaker(bind=engine)
    with Session() as session:
        for c in DEMO_CLASSES:
            existing = session.query(Class).filter(Class.name == c["name"]).first()
            if not existing:
                cls = Class(name=c["name"], grade=c["grade"], section=c["section"])
                session.add(cls)
        session.commit()
        print("\nClasses created!")
        print("\nTo set up, open /setup in your browser and create a Super Admin account.")

if __name__ == "__main__":
    seed()
