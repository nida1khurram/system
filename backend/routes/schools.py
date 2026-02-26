from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models import School, User, UserRole, Admin, SchoolSettings, Student, Teacher
from auth import require_global_super_admin, hash_password
import time

router = APIRouter(prefix="/api/schools", tags=["Schools"])


class SchoolCreate(BaseModel):
    name: str
    # Optional first admin for the school
    admin_name: Optional[str] = None
    admin_email: Optional[EmailStr] = None
    admin_password: Optional[str] = None


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class SchoolAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.get("/")
def list_schools(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_global_super_admin),
):
    """Super admin: list all schools with stats."""
    schools = db.query(School).order_by(School.created_at.desc()).all()
    result = []
    for school in schools:
        student_count = (
            db.query(func.count(Student.id))
            .join(User, Student.user_id == User.id)
            .filter(User.school_id == school.id, Student.is_active == True)
            .scalar() or 0
        )
        teacher_count = (
            db.query(func.count(Teacher.id))
            .join(User, Teacher.user_id == User.id)
            .filter(User.school_id == school.id)
            .scalar() or 0
        )
        # Get school's admin user
        admin_user = (
            db.query(User)
            .filter(User.school_id == school.id, User.role == UserRole.admin)
            .first()
        )
        result.append({
            "id": school.id,
            "name": school.name,
            "is_active": school.is_active,
            "created_at": str(school.created_at),
            "student_count": student_count,
            "teacher_count": teacher_count,
            "admin_name": admin_user.name if admin_user else None,
            "admin_email": admin_user.email if admin_user else None,
        })
    return {"success": True, "schools": result}


@router.post("/", status_code=201)
def create_school(
    body: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_global_super_admin),
):
    """Super admin: create a school + optional first admin."""
    # Check name uniqueness
    existing = db.query(School).filter(School.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="A school with this name already exists")

    # 1. Create School record
    school = School(
        name=body.name,
        is_active=True,
        created_by=current_user["user_id"],
    )
    db.add(school)
    db.flush()  # get school.id

    admin_info = None

    # 2. Create admin user if credentials provided
    if body.admin_name and body.admin_email and body.admin_password:
        if db.query(User).filter(User.email == body.admin_email).first():
            raise HTTPException(status_code=409, detail="Admin email already registered")

        admin_user = User(
            name=body.admin_name,
            email=body.admin_email,
            password_hash=hash_password(body.admin_password),
            role=UserRole.admin,
            is_active=True,
            is_super_admin=True,
            school_id=school.id,
        )
        db.add(admin_user)
        db.flush()

        db.add(Admin(
            user_id=admin_user.id,
            employee_id=f"ADM-{int(time.time())}",
            designation="School Administrator",
        ))

        admin_info = {
            "name": admin_user.name,
            "email": admin_user.email,
            "password": body.admin_password,
        }

    # 3. Create initial SchoolSettings for this school
    db.add(SchoolSettings(
        school_id=school.id,
        school_name=body.name,
    ))

    db.commit()
    db.refresh(school)

    return {
        "success": True,
        "school": {
            "id": school.id,
            "name": school.name,
            "is_active": school.is_active,
        },
        "admin": admin_info,
    }


@router.get("/{school_id}")
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_global_super_admin),
):
    """Super admin: get school details + stats."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    student_count = (
        db.query(func.count(Student.id))
        .join(User, Student.user_id == User.id)
        .filter(User.school_id == school.id, Student.is_active == True)
        .scalar() or 0
    )
    teacher_count = (
        db.query(func.count(Teacher.id))
        .join(User, Teacher.user_id == User.id)
        .filter(User.school_id == school.id)
        .scalar() or 0
    )
    admins = (
        db.query(User)
        .filter(User.school_id == school.id, User.role == UserRole.admin)
        .all()
    )

    return {
        "success": True,
        "school": {
            "id": school.id,
            "name": school.name,
            "is_active": school.is_active,
            "created_at": str(school.created_at),
            "student_count": student_count,
            "teacher_count": teacher_count,
            "admins": [{"id": a.id, "name": a.name, "email": a.email} for a in admins],
        },
    }


@router.put("/{school_id}")
def update_school(
    school_id: int,
    body: SchoolUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_global_super_admin),
):
    """Super admin: update school name or active status."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if body.name is not None:
        existing = db.query(School).filter(School.name == body.name, School.id != school_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="School name already taken")
        school.name = body.name
    if body.is_active is not None:
        school.is_active = body.is_active

    db.commit()
    db.refresh(school)
    return {"success": True, "school": {"id": school.id, "name": school.name, "is_active": school.is_active}}


@router.post("/{school_id}/admin", status_code=201)
def create_school_admin(
    school_id: int,
    body: SchoolAdminCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_global_super_admin),
):
    """Super admin: create an admin user for a specific school."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    admin_user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.admin,
        is_active=True,
        is_super_admin=True,
        school_id=school_id,
    )
    db.add(admin_user)
    db.flush()

    db.add(Admin(
        user_id=admin_user.id,
        employee_id=f"ADM-{int(time.time())}",
        designation="School Administrator",
    ))
    db.commit()

    return {
        "success": True,
        "admin": {"id": admin_user.id, "name": admin_user.name, "email": admin_user.email},
    }
