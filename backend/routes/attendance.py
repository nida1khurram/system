from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Attendance, Student, User
from schemas import AttendanceBulk
from auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/")
def get_attendance(class_id: int = None, date_filter: str = None, student_id: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = db.query(Attendance, User).join(Student, Attendance.student_id == Student.id).join(User, Student.user_id == User.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(Attendance.school_id == school_id)
    if class_id:
        query = query.filter(Attendance.class_id == class_id)
    if date_filter:
        query = query.filter(Attendance.date == date_filter)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)

    rows = query.all()
    return {"success": True, "attendance": [{"id": a.id, "date": str(a.date), "status": a.status, "student_name": u.name, "student_id": a.student_id} for a, u in rows]}


@router.post("/")
def mark_attendance(body: AttendanceBulk, db: Session = Depends(get_db), current_user: dict = Depends(require_teacher_or_admin)):
    school_id = current_user.get("school_id")
    for record in body.records:
        att = Attendance(student_id=record.student_id, class_id=record.class_id, date=record.date, status=record.status, marked_by=None, remarks=record.remarks, school_id=school_id)
        db.add(att)
    db.commit()
    return {"success": True, "count": len(body.records)}
