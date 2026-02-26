import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import SchoolSettings
from auth import get_current_user, require_super_admin, require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_base64: Optional[str] = None
    logo_mime: Optional[str] = None
    academic_year: Optional[str] = None


def get_or_create_settings(db: Session, school_id: int = None) -> SchoolSettings:
    if school_id:
        settings = db.query(SchoolSettings).filter(SchoolSettings.school_id == school_id).first()
        if not settings:
            settings = SchoolSettings(school_name="My School", school_id=school_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
    else:
        # Super admin or legacy: get settings without school_id (global)
        settings = db.query(SchoolSettings).filter(SchoolSettings.school_id == None).first()
        if not settings:
            # Fall back to the first available settings
            settings = db.query(SchoolSettings).first()
        if not settings:
            settings = SchoolSettings(school_name="My School")
            db.add(settings)
            db.commit()
            db.refresh(settings)
    return settings


@router.get("/")
def get_settings(school_id: int = None, db: Session = Depends(get_db)):
    """Public endpoint — accepts optional school_id param for multi-school support."""
    s = get_or_create_settings(db, school_id=school_id)
    return {
        "school_name": s.school_name,
        "tagline": s.tagline,
        "address": s.address,
        "phone": s.phone,
        "email": s.email,
        "logo_base64": s.logo_base64,
        "logo_mime": s.logo_mime,
        "academic_year": s.academic_year,
    }


@router.put("/")
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    if data.school_name is not None:
        s.school_name = data.school_name
    if data.tagline is not None:
        s.tagline = data.tagline
    if data.address is not None:
        s.address = data.address
    if data.phone is not None:
        s.phone = data.phone
    if data.email is not None:
        s.email = data.email
    if data.logo_base64 is not None:
        s.logo_base64 = data.logo_base64
    if data.logo_mime is not None:
        s.logo_mime = data.logo_mime
    if data.academic_year is not None:
        s.academic_year = data.academic_year
    db.commit()
    db.refresh(s)
    return {"success": True, "message": "Settings updated successfully"}


DEFAULT_ADMIN_PERMS = {
    "show_users": True,
    "show_students": True,
    "show_teachers": True,
    "show_fee_management": True,
    "show_settings": True,
}


class AdminPermissionsUpdate(BaseModel):
    show_users: bool = True
    show_students: bool = True
    show_teachers: bool = True
    show_fee_management: bool = True
    show_settings: bool = True


@router.get("/admin-permissions")
def get_admin_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    if s.admin_permissions:
        try:
            return json.loads(s.admin_permissions)
        except Exception:
            pass
    return DEFAULT_ADMIN_PERMS.copy()


@router.put("/admin-permissions")
def update_admin_permissions(
    data: AdminPermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    s.admin_permissions = json.dumps(data.model_dump())
    db.commit()
    return {"success": True, "message": "Admin permissions updated"}


class PaymentSettingsUpdate(BaseModel):
    jazzcash_merchant_id: Optional[str] = None
    jazzcash_password: Optional[str] = None
    jazzcash_integrity_salt: Optional[str] = None
    jazzcash_is_sandbox: Optional[bool] = None
    jazzcash_enabled: Optional[bool] = None
    jazzcash_number: Optional[str] = None


@router.get("/payment")
def get_payment_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    return {
        "jazzcash_merchant_id":    s.jazzcash_merchant_id or "",
        "jazzcash_password":       "••••••••" if s.jazzcash_password else "",
        "jazzcash_integrity_salt": "••••••••" if s.jazzcash_integrity_salt else "",
        "jazzcash_is_sandbox":     s.jazzcash_is_sandbox if s.jazzcash_is_sandbox is not None else True,
        "jazzcash_enabled":        s.jazzcash_enabled or False,
        "configured":              bool(s.jazzcash_merchant_id and s.jazzcash_password and s.jazzcash_integrity_salt),
        "jazzcash_number":         s.jazzcash_number or "",
    }


@router.put("/payment")
def update_payment_settings(
    data: PaymentSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    if data.jazzcash_merchant_id is not None:
        s.jazzcash_merchant_id = data.jazzcash_merchant_id
    if data.jazzcash_password is not None and data.jazzcash_password not in ("", "••••••••"):
        s.jazzcash_password = data.jazzcash_password
    if data.jazzcash_integrity_salt is not None and data.jazzcash_integrity_salt not in ("", "••••••••"):
        s.jazzcash_integrity_salt = data.jazzcash_integrity_salt
    if data.jazzcash_is_sandbox is not None:
        s.jazzcash_is_sandbox = data.jazzcash_is_sandbox
    if data.jazzcash_enabled is not None:
        s.jazzcash_enabled = data.jazzcash_enabled
    if data.jazzcash_number is not None:
        s.jazzcash_number = data.jazzcash_number.strip() or None
    db.commit()
    return {"success": True, "message": "Payment settings updated"}


@router.get("/payment-info")
def get_payment_info(school_id: int = None, db: Session = Depends(get_db)):
    """Public endpoint — returns school's JazzCash number for manual transfers."""
    s = get_or_create_settings(db, school_id=school_id)
    return {
        "school_name":     s.school_name or "School",
        "jazzcash_number": s.jazzcash_number or "",
    }


@router.delete("/logo")
def remove_logo(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    s = get_or_create_settings(db, school_id=current_user.get("school_id"))
    s.logo_base64 = None
    s.logo_mime = None
    db.commit()
    return {"success": True, "message": "Logo removed"}
