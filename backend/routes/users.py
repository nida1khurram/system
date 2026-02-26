from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import time
from models import User, UserRole, Admin, Teacher, Parent
from auth import require_admin, require_super_admin, hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: Optional[str] = ""
    is_super_admin: Optional[bool] = False


@router.post("/create", status_code=201)
def create_user(body: CreateUserRequest, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    # Only super admin can create another admin
    if body.role == "admin" and not current_user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Only Super Admin can create an admin account")

    try:
        role_enum = UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="This email is already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=role_enum,
        phone=body.phone,
        is_active=True,
        is_super_admin=body.is_super_admin if body.role == "admin" else False,
        school_id=current_user.get("school_id"),
    )
    db.add(user)
    db.flush()

    if body.role == "admin":
        db.add(Admin(
            user_id=user.id,
            employee_id=f"ADM-{int(time.time())}",
            designation="Administrator",
        ))
    elif body.role == "teacher":
        db.add(Teacher(
            user_id=user.id,
            employee_id=f"EMP-{int(time.time())}",
        ))
    elif body.role == "parent":
        db.add(Parent(user_id=user.id))

    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value},
    }


@router.get("/")
def get_all_users(role: str = None, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    query = db.query(User)
    school_id = current_user.get("school_id")
    if school_id:
        query = query.filter(User.school_id == school_id)
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
    users = query.order_by(User.created_at.desc()).all()
    return {
        "success": True,
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role.value,
                "phone": u.phone,
                "is_active": u.is_active,
                "created_at": str(u.created_at),
            }
            for u in users
        ]
    }


@router.patch("/{user_id}/toggle")
def toggle_user_status(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"success": True, "is_active": user.is_active}
