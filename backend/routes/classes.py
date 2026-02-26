from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Class, Teacher, User
from auth import get_current_user, require_admin, require_super_admin
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/classes", tags=["Classes"])


class ClassCreate(BaseModel):
    name: str
    grade: str
    section: str = "A"
    capacity: int = 30


@router.get("/")
def get_classes(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = db.query(Class).order_by(Class.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(Class.school_id == school_id)
    classes = query.all()
    return {"success": True, "classes": [{"id": c.id, "name": c.name, "grade": c.grade, "section": c.section, "capacity": c.capacity} for c in classes]}


@router.post("/", status_code=201)
def create_class(body: ClassCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    cls = Class(name=body.name, grade=body.grade, section=body.section, capacity=body.capacity, school_id=current_user.get("school_id"))
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return {"success": True, "class": {"id": cls.id, "name": cls.name}}
