from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Admin, User, UserRole
from auth import get_current_user, require_admin, hash_password
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date
import time

router = APIRouter(prefix="/api/admins", tags=["Admins"])


class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    designation: Optional[str] = "Administrator"
    department: Optional[str] = None
    joining_date: Optional[date] = None


@router.get("/")
def get_admins(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    query = db.query(Admin, User).join(User, Admin.user_id == User.id)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(User.school_id == school_id)
    rows = query.all()
    return {
        "success": True,
        "admins": [
            {
                "id": a.id,
                "employee_id": a.employee_id,
                "designation": a.designation,
                "department": a.department,
                "joining_date": str(a.joining_date) if a.joining_date else None,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "is_active": u.is_active,
                "created_at": str(a.created_at),
            }
            for a, u in rows
        ]
    }


@router.post("/", status_code=201)
def create_admin(body: AdminCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.admin,
        phone=body.phone,
        is_super_admin=True,
        school_id=current_user.get("school_id"),
    )
    db.add(new_user)
    db.flush()

    admin = Admin(
        user_id=new_user.id,
        employee_id=f"ADM-{int(time.time())}",
        designation=body.designation,
        department=body.department,
        joining_date=body.joining_date,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"success": True, "admin": {"id": admin.id, "employee_id": admin.employee_id}}


@router.delete("/{admin_id}")
def remove_admin(admin_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    user = db.query(User).filter(User.id == admin.user_id).first()
    if user:
        user.is_active = False
    db.commit()
    return {"success": True}
