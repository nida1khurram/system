from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Message, User, UserRole, Parent, Student, Class
from schemas import MessageCreate
from auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/recipients")
def get_recipients(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Return messageable users based on caller's role:
    - Parents/students/teachers → get admins + teachers
    - Admins → get admins + teachers + parents
    """
    role = current_user.get("role", "")
    if role == "admin":
        allowed_roles = [UserRole.admin, UserRole.teacher, UserRole.parent]
    elif role == "parent":
        allowed_roles = [UserRole.admin]  # parents can only message admins
    else:
        allowed_roles = [UserRole.admin, UserRole.teacher]

    school_id = current_user.get("school_id")
    recipient_query = db.query(User).filter(
        User.role.in_(allowed_roles),
        User.is_active == True,
        User.id != current_user["user_id"],  # exclude self
    )
    if school_id:
        recipient_query = recipient_query.filter(User.school_id == school_id)
    users = recipient_query.order_by(User.role, User.name).all()
    return {
        "success": True,
        "recipients": [
            {"id": u.id, "name": u.name, "role": u.role.value}
            for u in users
        ],
    }


@router.get("/")
def get_messages(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    is_super_admin = current_user.get("is_super_admin", False)

    # Super admin sees ALL messages in the system
    if is_super_admin:
        msgs = db.query(Message).order_by(Message.created_at.desc()).all()
    else:
        msgs = db.query(Message).filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        ).order_by(Message.created_at.desc()).all()

    # Build sender/receiver name map
    user_ids = set()
    for m in msgs:
        user_ids.add(m.sender_id)
        user_ids.add(m.receiver_id)
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    name_map = {u.id: u.name for u in users}

    return {
        "success": True,
        "messages": [
            {
                "id": m.id,
                "subject": m.subject,
                "message": m.message,
                "is_read": m.is_read,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "sender_name": name_map.get(m.sender_id, "Unknown"),
                "receiver_name": name_map.get(m.receiver_id, "Unknown"),
                "created_at": str(m.created_at),
            }
            for m in msgs
        ],
    }


@router.post("/", status_code=201)
def send_message(body: MessageCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    final_message = body.message

    # If sender is a parent, auto-append their children's info
    if current_user.get("role") == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
        if parent:
            children = (
                db.query(Student, User, Class)
                .join(User, Student.user_id == User.id)
                .outerjoin(Class, Student.class_id == Class.id)
                .filter(Student.parent_id == parent.id, Student.is_active == True)
                .all()
            )
            if children:
                info_lines = ["\n\n--- Student Information ---"]
                for s, u, c in children:
                    line = f"• {u.name}"
                    if c:
                        line += f" | Class: {c.name}"
                    if s.roll_number:
                        line += f" | Roll#: {s.roll_number}"
                    if s.admission_number:
                        line += f" | Admission#: {s.admission_number}"
                    info_lines.append(line)
                final_message += "\n".join(info_lines)

    msg = Message(
        sender_id=current_user["user_id"],
        receiver_id=body.receiver_id,
        subject=body.subject,
        message=final_message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"success": True, "message": {"id": msg.id}}


@router.delete("/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """User can delete a message they sent or received."""
    user_id = current_user["user_id"]
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != user_id and msg.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(msg)
    db.commit()
    return {"success": True}
