from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Mark, Student, User
from schemas import MarkCreate
from auth import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/marks", tags=["Marks"])


def calculate_grade(obtained: int, total: int) -> str:
    pct = (obtained / total) * 100
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B"
    if pct >= 60: return "C"
    if pct >= 50: return "D"
    return "F"


@router.get("/")
def get_marks(student_id: int = None, class_id: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = db.query(Mark, User).join(Student, Mark.student_id == Student.id).join(User, Student.user_id == User.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(Mark.school_id == school_id)
    if student_id:
        query = query.filter(Mark.student_id == student_id)
    if class_id:
        query = query.filter(Mark.class_id == class_id)
    rows = query.all()
    return {"success": True, "marks": [{"id": m.id, "subject": m.subject, "exam_type": m.exam_type, "total_marks": m.total_marks, "obtained_marks": m.obtained_marks, "grade": m.grade, "student_name": u.name} for m, u in rows]}


@router.post("/", status_code=201)
def add_marks(body: MarkCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_teacher_or_admin)):
    grade = calculate_grade(body.obtained_marks, body.total_marks)
    mark = Mark(student_id=body.student_id, class_id=body.class_id, subject=body.subject, exam_type=body.exam_type, total_marks=body.total_marks, obtained_marks=body.obtained_marks, grade=grade, exam_date=body.exam_date, remarks=body.remarks, school_id=current_user.get("school_id"))
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return {"success": True, "mark": {"id": mark.id, "grade": mark.grade}}
