from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models import User, UserRole, Admin, Parent, School, SchoolSettings
from schemas import LoginRequest, RegisterRequest, TokenResponse
from auth import verify_password, hash_password, create_access_token, decode_token, get_current_user, add_token_to_blacklist, bearer_scheme
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import time

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SetupRequest(BaseModel):
    name: str
    email: str
    password: str


class RegisterSchoolRequest(BaseModel):
    school_name: str
    admin_name: str
    email: EmailStr
    password: str


@router.get("/setup-check")
def setup_check(db: Session = Depends(get_db)):
    """Check if global super admin (school_id=None) exists — for system-level setup."""
    global_admin_exists = db.query(User).filter(
        User.role == UserRole.admin,
        User.is_super_admin == True,
        User.school_id.is_(None),
    ).first()
    return {"needs_setup": global_admin_exists is None}


@router.post("/setup", status_code=201)
def setup(body: SetupRequest, db: Session = Depends(get_db)):
    """Create the first Global Super Admin — only works when no global super admin exists."""
    global_admin_exists = db.query(User).filter(
        User.role == UserRole.admin,
        User.is_super_admin == True,
        User.school_id.is_(None),
    ).first()
    if global_admin_exists:
        raise HTTPException(status_code=403, detail="Global Super Admin already exists.")

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    admin = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.admin,
        is_active=True,
        is_super_admin=True,
    )
    db.add(admin)
    db.flush()

    db.add(Admin(
        user_id=admin.id,
        employee_id=f"ADM-{int(time.time())}",
        designation="Super Administrator",
    ))
    db.commit()
    db.refresh(admin)

    token = create_access_token({"user_id": admin.id, "role": "admin", "email": admin.email, "is_super_admin": True, "school_id": None})
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": admin.id, "name": admin.name, "email": admin.email, "role": "admin", "is_super_admin": True, "school_id": None},
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Auto-create Parent record if missing (safety net for old accounts)
    if user.role.value == "parent":
        existing_parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if not existing_parent:
            db.add(Parent(user_id=user.id))
            db.commit()

    token = create_access_token({"user_id": user.id, "role": user.role.value, "email": user.email, "is_super_admin": user.is_super_admin, "school_id": user.school_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "is_super_admin": user.is_super_admin, "school_id": user.school_id}
    }


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole(body.role),
        phone=body.phone,
    )
    db.add(user)
    db.flush()  # get user.id before commit

    # Create role-specific profile record
    if body.role == "parent":
        db.add(Parent(user_id=user.id))

    db.commit()
    db.refresh(user)

    # Auto-login: return token so frontend can proceed immediately
    token = create_access_token({"user_id": user.id, "role": user.role.value, "email": user.email, "is_super_admin": False, "school_id": user.school_id})
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role.value, "is_super_admin": False, "school_id": user.school_id},
    }


@router.post("/register-school", status_code=201)
def register_school(body: RegisterSchoolRequest, db: Session = Depends(get_db)):
    """Open endpoint — any school owner registers their school and becomes its Sub Admin."""
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if db.query(School).filter(School.name == body.school_name.strip()).first():
        raise HTTPException(status_code=409, detail="A school with this name already exists")

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create School
    school = School(name=body.school_name.strip(), is_active=True)
    db.add(school)
    db.flush()  # get school.id

    # Create User as Sub Admin (is_super_admin=True, school_id set)
    admin_user = User(
        name=body.admin_name.strip(),
        email=body.email,
        password_hash=hash_password(body.password),
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

    db.add(SchoolSettings(school_id=school.id, school_name=body.school_name.strip()))

    db.commit()
    db.refresh(admin_user)

    token = create_access_token({
        "user_id": admin_user.id,
        "role": "admin",
        "email": admin_user.email,
        "is_super_admin": True,
        "school_id": school.id,
    })
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": admin_user.id,
            "name": admin_user.name,
            "email": admin_user.email,
            "role": "admin",
            "is_super_admin": True,
            "school_id": school.id,
        },
    }


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = decode_token(token)
    exp = payload.get("exp")
    expires_at = datetime.utcfromtimestamp(exp) if exp else datetime.utcnow() + timedelta(hours=1)
    add_token_to_blacklist(db, token, current_user["user_id"], expires_at)
    return {"success": True, "message": "Logged out"}
