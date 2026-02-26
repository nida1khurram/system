from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Homework, Teacher, User, Class, Student, Parent
from auth import get_current_user
from datetime import date

router = APIRouter(prefix="/api/homework", tags=["Homework"])


class HomeworkCreate(BaseModel):
    subject:     str
    title:       str
    description: Optional[str] = ""
    due_date:    str            # "YYYY-MM-DD"
    class_id:    Optional[int] = None
    file_name:   Optional[str] = None
    file_data:   Optional[str] = None   # base64
    file_mime:   Optional[str] = None


def _row(hw: Homework, teacher_name: str = "", class_name: str = "") -> dict:
    return {
        "id":           hw.id,
        "teacher_id":   hw.teacher_id,
        "teacher_name": teacher_name or "",
        "class_id":     hw.class_id,
        "class_name":   class_name or "",
        "subject":      hw.subject,
        "title":        hw.title,
        "description":  hw.description or "",
        "due_date":     str(hw.due_date),
        "file_name":    hw.file_name,
        "file_mime":    hw.file_mime,
        "has_file":     bool(hw.file_data),
        "created_at":   str(hw.created_at),
    }


@router.get("/")
def get_homeworks(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "")

    school_id = current_user.get("school_id")

    # Students: only see homework for their class
    if role == "student":
        student = (
            db.query(Student)
            .filter(Student.user_id == current_user["user_id"])
            .first()
        )
        class_id = student.class_id if student else None

        query = (
            db.query(Homework, User, Class)
            .outerjoin(Teacher, Homework.teacher_id == Teacher.id)
            .outerjoin(User,    Teacher.user_id    == User.id)
            .outerjoin(Class,   Homework.class_id  == Class.id)
            .order_by(Homework.created_at.desc())
        )
        if school_id:
            query = query.filter(Homework.school_id == school_id)
        if class_id:
            query = query.filter(
                (Homework.class_id == class_id) | (Homework.class_id == None)
            )
        rows = query.all()
        return {
            "success":   True,
            "homeworks": [_row(hw, u.name if u else "", c.name if c else "") for hw, u, c in rows],
        }

    # Parents: see homework filtered by school
    if role == "parent":
        query = (
            db.query(Homework, User, Class)
            .outerjoin(Teacher, Homework.teacher_id == Teacher.id)
            .outerjoin(User,    Teacher.user_id    == User.id)
            .outerjoin(Class,   Homework.class_id  == Class.id)
            .order_by(Homework.created_at.desc())
        )
        if school_id:
            query = query.filter(Homework.school_id == school_id)
        rows = query.all()
        return {
            "success":   True,
            "homeworks": [_row(hw, u.name if u else "", c.name if c else "") for hw, u, c in rows],
        }

    # Teachers and admins: see all homework (filtered by school)
    school_id = current_user.get("school_id")
    query = (
        db.query(Homework, User, Class)
        .outerjoin(Teacher, Homework.teacher_id == Teacher.id)
        .outerjoin(User,    Teacher.user_id    == User.id)
        .outerjoin(Class,   Homework.class_id  == Class.id)
        .order_by(Homework.created_at.desc())
    )
    if school_id:
        query = query.filter(Homework.school_id == school_id)
    rows = query.all()
    return {
        "success":   True,
        "homeworks": [_row(hw, u.name if u else "", c.name if c else "") for hw, u, c in rows],
    }


@router.post("/", status_code=201)
def create_homework(
    body: HomeworkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "")
    if role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Only teachers can assign homework")

    teacher = db.query(Teacher).filter(Teacher.user_id == current_user["user_id"]).first()

    try:
        due = date.fromisoformat(body.due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format (use YYYY-MM-DD)")

    hw = Homework(
        teacher_id  = teacher.id if teacher else None,
        class_id    = body.class_id,
        subject     = body.subject,
        title       = body.title,
        description = body.description,
        due_date    = due,
        file_name   = body.file_name,
        file_data   = body.file_data,
        file_mime   = body.file_mime,
        school_id   = current_user.get("school_id"),
    )
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return {"success": True, "id": hw.id}


@router.get("/{hw_id}/download")
def download_file(
    hw_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    hw = db.query(Homework).filter(Homework.id == hw_id).first()
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")
    if not hw.file_data:
        raise HTTPException(status_code=404, detail="No file attached")
    return {
        "success":   True,
        "file_name": hw.file_name,
        "file_mime": hw.file_mime,
        "file_data": hw.file_data,
    }


@router.delete("/{hw_id}")
def delete_homework(
    hw_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    hw = db.query(Homework).filter(Homework.id == hw_id).first()
    if not hw:
        raise HTTPException(status_code=404, detail="Not found")

    role = current_user.get("role", "")
    if role != "admin":
        teacher = db.query(Teacher).filter(Teacher.user_id == current_user["user_id"]).first()
        if teacher and hw.teacher_id == teacher.id:
            pass
        elif hw.teacher_id is None and role == "teacher":
            pass
        else:
            raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(hw)
    db.commit()
    return {"success": True}
