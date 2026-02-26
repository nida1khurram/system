from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Student, User, Class, Teacher, Parent, FeeInvoice, Payment, PaymentStatus
from schemas import StudentCreate, StudentUpdate
from auth import get_current_user, require_admin, require_teacher_or_admin, hash_password
from pydantic import BaseModel
import time, random, string


def _generate_link_code(db: Session) -> str:
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(100):
        code = ''.join(random.choices(chars, k=3)) + '-' + ''.join(random.choices(chars, k=3))
        if not db.query(Student).filter(Student.link_code == code).first():
            return code
    raise RuntimeError("Could not generate unique link code")

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    school_id = current_user.get("school_id")

    student_q = db.query(func.count(Student.id)).join(User, Student.user_id == User.id).filter(Student.is_active == True)
    teacher_q = db.query(func.count(Teacher.id)).join(User, Teacher.user_id == User.id)
    parent_q  = db.query(func.count(Parent.id)).join(User, Parent.user_id == User.id)
    invoice_q = db.query(func.count(FeeInvoice.id)).filter(FeeInvoice.is_paid == False)
    payment_q = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == PaymentStatus.completed)

    if school_id:
        student_q  = student_q.filter(User.school_id == school_id)
        teacher_q  = teacher_q.filter(User.school_id == school_id)
        parent_q   = parent_q.filter(User.school_id == school_id)
        invoice_q  = invoice_q.filter(FeeInvoice.school_id == school_id)
        payment_q  = payment_q.join(FeeInvoice, Payment.invoice_id == FeeInvoice.id).filter(FeeInvoice.school_id == school_id)

    return {
        "total_students": student_q.scalar() or 0,
        "total_teachers": teacher_q.scalar() or 0,
        "total_parents":  parent_q.scalar() or 0,
        "pending_invoices": invoice_q.scalar() or 0,
        "total_collected": float(payment_q.scalar() or 0),
    }


@router.get("/")
def get_students(class_id: int = None, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")

    # Students cannot list all students
    if role == "student":
        raise HTTPException(status_code=403, detail="Students cannot access the student directory")

    # Parents can only see their own linked children
    if role == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
        if not parent:
            return {"success": True, "students": []}
        rows = (
            db.query(Student, User, Class)
            .join(User, Student.user_id == User.id)
            .outerjoin(Class, Student.class_id == Class.id)
            .filter(Student.parent_id == parent.id, Student.is_active == True)
            .all()
        )
        return {
            "success": True,
            "students": [
                {
                    "id": s.id, "roll_number": s.roll_number, "gender": s.gender,
                    "is_active": s.is_active, "name": u.name,
                    "class_id": s.class_id, "class_name": c.name if c else None,
                }
                for s, u, c in rows
            ],
        }

    # Admin / Super Admin / Teacher: full list
    show_link_code = role in ("admin", "teacher") or current_user.get("is_super_admin")
    query = db.query(Student, User, Class).join(User, Student.user_id == User.id).outerjoin(Class, Student.class_id == Class.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(User.school_id == school_id)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    rows = query.all()
    return {
        "success": True,
        "students": [
            {
                "id": s.id, "roll_number": s.roll_number, "admission_number": s.admission_number,
                **({"link_code": s.link_code} if show_link_code else {}),
                "gender": s.gender, "is_active": s.is_active,
                "name": u.name, "email": u.email, "phone": u.phone,
                "class_id": s.class_id, "class_name": c.name if c else None, "grade": c.grade if c else None,
            }
            for s, u, c in rows
        ],
    }


@router.get("/profile")
def get_my_profile(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Student's own profile — returns their link_code and details."""
    row = (
        db.query(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .filter(Student.user_id == current_user["user_id"])
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    s, u, c = row
    return {
        "success": True,
        "student": {
            "id": s.id, "name": u.name, "email": u.email,
            "roll_number": s.roll_number, "link_code": s.link_code,
            "class_name": c.name if c else None, "gender": s.gender,
        },
    }


@router.get("/my-children")
def get_my_children(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this")

    parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
    if not parent:
        return {"success": True, "children": []}

    rows = (
        db.query(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .filter(Student.parent_id == parent.id, Student.is_active == True)
        .all()
    )
    return {
        "success": True,
        "children": [
            {
                "id": s.id, "name": u.name, "roll_number": s.roll_number,
                "link_code": s.link_code, "class_name": c.name if c else None,
                "gender": s.gender, "is_active": s.is_active,
            }
            for s, u, c in rows
        ],
    }


@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    row = db.query(Student, User, Class).join(User, Student.user_id == User.id).outerjoin(Class, Student.class_id == Class.id).filter(Student.id == student_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    s, u, c = row
    return {"success": True, "student": {
        "id": s.id, "name": u.name, "email": u.email, "phone": u.phone,
        "roll_number": s.roll_number, "admission_number": s.admission_number,
        "link_code": s.link_code, "class_id": s.class_id, "class_name": c.name if c else None,
        "gender": s.gender, "blood_group": s.blood_group,
        "father_name": s.father_name, "address": s.address,
        "date_of_birth": str(s.date_of_birth) if s.date_of_birth else None,
        "admission_date": str(s.admission_date) if s.admission_date else None,
        "is_active": s.is_active,
        "created_at": str(s.created_at) if s.created_at else None,
    }}


def generate_roll_number(class_id: int, db: Session) -> str:
    """Auto-generate class-wise roll number: e.g. C1-001, C2-005, NUR-003"""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        prefix = "STU"
    else:
        grade = cls.grade.upper()
        prefix_map = {
            "NURSERY": "NUR", "KG": "KG", "PREP": "PRE",
            "1": "C1", "2": "C2", "3": "C3", "4": "C4", "5": "C5",
            "6": "C6", "7": "C7", "8": "C8", "9": "C9", "10": "C10",
        }
        prefix = prefix_map.get(grade, f"C{grade}")

    # Count existing students in this class
    count = db.query(func.count(Student.id)).filter(Student.class_id == class_id).scalar() or 0
    return f"{prefix}-{count + 1:03d}"


@router.post("/", status_code=201)
def create_student(body: StudentCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_teacher_or_admin)):
    # Auto-generate email if not provided
    email = body.email.strip() if body.email and body.email.strip() else f"student_{int(time.time())}_{random.randint(100,999)}@school.local"
    # Auto-generate password if not provided
    password = body.password if body.password and body.password.strip() else ''.join(random.choices(string.ascii_letters + string.digits, k=12))

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    new_user = User(name=body.name, email=email, password_hash=hash_password(password), role="student", phone=body.phone, school_id=current_user.get("school_id"))
    db.add(new_user)
    db.flush()

    roll_number = generate_roll_number(body.class_id, db)
    admission_number = f"ADM-{int(time.time())}"
    link_code = _generate_link_code(db)

    student = Student(user_id=new_user.id, roll_number=roll_number, admission_number=admission_number, link_code=link_code, class_id=body.class_id, parent_id=body.parent_id, date_of_birth=body.date_of_birth, gender=body.gender, blood_group=body.blood_group, father_name=body.father_name, address=body.address)
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"success": True, "student": {"id": student.id, "roll_number": student.roll_number, "admission_number": student.admission_number, "link_code": student.link_code}}


@router.put("/{student_id}")
def update_student(student_id: int, body: StudentUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if hasattr(student, field):
            setattr(student, field, value)
    db.commit()
    return {"success": True}


@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.is_active = False
    db.commit()
    return {"success": True}


class LinkChildRequest(BaseModel):
    link_code: str


# ─── Parent: link child by code ───────────────────────────────────────────────
@router.post("/link-child")
def link_child(body: LinkChildRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Only parents can link children")

    code = body.link_code.strip().upper()
    student = db.query(Student).filter(Student.link_code == code).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid link code — student not found")

    parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if student.parent_id == parent.id:
        raise HTTPException(status_code=400, detail="This student is already linked to your account")

    student.parent_id = parent.id
    db.commit()

    row = db.query(Student, User, Class).join(User, Student.user_id == User.id).outerjoin(Class, Student.class_id == Class.id).filter(Student.id == student.id).first()
    s, u, c = row
    return {
        "success": True,
        "message": f"{u.name} linked successfully!",
        "student": {
            "id": s.id, "name": u.name, "roll_number": s.roll_number,
            "class_name": c.name if c else None, "link_code": s.link_code,
        },
    }
