from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Teacher, User, UserRole
from auth import get_current_user, require_admin, require_super_admin, require_teacher_or_admin, hash_password
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
import time

router = APIRouter(prefix="/api/teachers", tags=["Teachers"])


class TeacherCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    qualification: Optional[str] = None
    subject: Optional[str] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None


@router.get("/")
def get_teachers(db: Session = Depends(get_db), current_user: dict = Depends(require_teacher_or_admin)):
    query = db.query(Teacher, User).join(User, Teacher.user_id == User.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(User.school_id == school_id)
    rows = query.all()
    return {"success": True, "teachers": [{"id": t.id, "name": u.name, "email": u.email, "phone": u.phone, "subject": t.subject, "qualification": t.qualification, "employee_id": t.employee_id, "joining_date": str(t.joining_date) if t.joining_date else None} for t, u in rows]}


@router.get("/{teacher_id}")
def get_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_teacher_or_admin)):
    row = db.query(Teacher, User).join(User, Teacher.user_id == User.id).filter(Teacher.id == teacher_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Teacher not found")
    t, u = row
    return {"success": True, "teacher": {"id": t.id, "name": u.name, "email": u.email, "phone": u.phone, "subject": t.subject, "qualification": t.qualification, "employee_id": t.employee_id, "joining_date": str(t.joining_date) if t.joining_date else None}}


@router.post("/", status_code=201)
def create_teacher(body: TeacherCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(name=body.name, email=body.email, password_hash=hash_password(body.password), role=UserRole.teacher, phone=body.phone, school_id=current_user.get("school_id"))
    db.add(new_user)
    db.flush()

    teacher = Teacher(
        user_id=new_user.id,
        employee_id=f"EMP-{int(time.time())}",
        qualification=body.qualification,
        subject=body.subject,
        joining_date=body.joining_date,
        salary=body.salary,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return {"success": True, "teacher": {"id": teacher.id, "employee_id": teacher.employee_id}}


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    user = db.query(User).filter(User.id == teacher.user_id).first()
    if user:
        user.is_active = False
    db.commit()
    return {"success": True}
