from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from database import get_db
from models import FeeStructure, FeeInvoice, Student, User, Class, StudentFeeOverride, Payment, PaymentStatus, PaymentMethod, FeeType, Parent
from schemas import FeeStructureCreate, DefaultFeeStructureCreate, InvoiceCreate, StudentFeeOverrideCreate, CollectFeeRequest, MarkPaidRequest
from auth import get_current_user, require_super_admin, require_admin
import random
import time
from datetime import datetime, date as date_type

router = APIRouter(prefix="/api/fees", tags=["Fees"])

FEE_TYPE_LABELS = {
    "monthly":   "Monthly Fee",
    "admission": "Admission Fee",
    "annual":    "Annual Fee",
    "exam":      "Exam Fee",
    "transport": "Transport Fee",
    "other":     "Other Charges",
}


def generate_invoice_number():
    return f"INV-{datetime.now().strftime('%y%m')}-{random.randint(1000,9999)}"


def invoice_row(i: FeeInvoice, student_name: str, class_name: str, fee_type: str):
    # Use invoice's own fee_type if stored, otherwise fall back to linked structure's fee_type
    actual = (i.fee_type.value if hasattr(i.fee_type, 'value') else i.fee_type) if i.fee_type else fee_type
    return {
        "id": i.id,
        "invoice_number": i.invoice_number,
        "student_id": i.student_id,
        "student_name": student_name,
        "class_name": class_name or "—",
        "fee_type": actual,
        "fee_type_label": FEE_TYPE_LABELS.get(actual, actual),
        "amount": float(i.amount),
        "late_fee": float(i.late_fee or 0),
        "total_amount": float(i.total_amount),
        "due_date": str(i.due_date),
        "month": i.month,
        "academic_year": i.academic_year,
        "is_paid": i.is_paid,
        "created_at": str(i.created_at),
    }


# ─── Fee Structures ───────────────────────────────────────────

@router.get("/structures")
def get_fee_structures(
    class_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    school_id = current_user.get("school_id")
    query = db.query(FeeStructure, Class).outerjoin(Class, FeeStructure.class_id == Class.id).filter(FeeStructure.is_active == True)
    if school_id:
        query = query.filter(FeeStructure.school_id == school_id)
    if class_id:
        query = query.filter(FeeStructure.class_id == class_id)
    rows = query.order_by(FeeStructure.class_id, FeeStructure.fee_type).all()
    return {
        "success": True,
        "fee_structures": [
            {
                "id": s.id,
                "class_id": s.class_id,
                "class_name": c.name if c else "Default (All Students)",
                "fee_type": s.fee_type.value if hasattr(s.fee_type, 'value') else s.fee_type,
                "fee_type_label": FEE_TYPE_LABELS.get(
                    s.fee_type.value if hasattr(s.fee_type, 'value') else s.fee_type, str(s.fee_type)
                ),
                "amount": float(s.amount),
                "due_date": s.due_date,
                "late_fee_per_day": float(s.late_fee_per_day or 0),
                "academic_year": s.academic_year,
            }
            for s, c in rows
        ],
    }


@router.post("/structures", status_code=201)
def create_fee_structure(
    body: FeeStructureCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    # If same class + fee_type already exists, update it
    existing = db.query(FeeStructure).filter(
        FeeStructure.class_id == body.class_id,
        FeeStructure.fee_type == body.fee_type,
        FeeStructure.academic_year == body.academic_year,
        FeeStructure.is_active == True,
    ).first()
    if existing:
        existing.amount = body.amount
        existing.due_date = body.due_date
        existing.late_fee_per_day = body.late_fee_per_day
        db.commit()
        return {"success": True, "updated": True, "id": existing.id}

    structure = FeeStructure(
        class_id=body.class_id,
        fee_type=body.fee_type,
        amount=body.amount,
        due_date=body.due_date,
        late_fee_per_day=body.late_fee_per_day,
        academic_year=body.academic_year,
        school_id=current_user.get("school_id"),
    )
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return {"success": True, "updated": False, "id": structure.id}


@router.get("/school-default")
def get_default_fee_structures(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all school-wide default fee structures (class_id = NULL)."""
    rows = db.query(FeeStructure).filter(
        FeeStructure.class_id == None,
        FeeStructure.is_active == True,
    ).order_by(FeeStructure.fee_type).all()
    return {
        "success": True,
        "school_defaults": [
            {
                "id": s.id,
                "fee_type": s.fee_type.value if hasattr(s.fee_type, "value") else s.fee_type,
                "fee_type_label": FEE_TYPE_LABELS.get(
                    s.fee_type.value if hasattr(s.fee_type, "value") else s.fee_type, str(s.fee_type)
                ),
                "amount": float(s.amount),
                "due_date": s.due_date,
                "late_fee_per_day": float(s.late_fee_per_day or 0),
                "academic_year": s.academic_year,
            }
            for s in rows
        ],
    }


@router.post("/school-default", status_code=201)
def create_default_fee_structure(
    body: DefaultFeeStructureCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create or update a school-wide default fee (class_id=None)."""
    existing = db.query(FeeStructure).filter(
        FeeStructure.class_id == None,
        FeeStructure.fee_type == body.fee_type,
        FeeStructure.academic_year == body.academic_year,
        FeeStructure.is_active == True,
    ).first()
    if existing:
        existing.amount = body.amount
        existing.due_date = body.due_date
        existing.late_fee_per_day = body.late_fee_per_day
        db.commit()
        return {"success": True, "updated": True, "id": existing.id}

    structure = FeeStructure(
        class_id=None,
        fee_type=body.fee_type,
        amount=body.amount,
        due_date=body.due_date,
        late_fee_per_day=body.late_fee_per_day,
        academic_year=body.academic_year,
    )
    db.add(structure)
    db.commit()
    db.refresh(structure)
    return {"success": True, "updated": False, "id": structure.id}


@router.delete("/structures/{structure_id}")
def delete_fee_structure(
    structure_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    s = db.query(FeeStructure).filter(FeeStructure.id == structure_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    s.is_active = False
    db.commit()
    return {"success": True}


# ─── Invoices ─────────────────────────────────────────────────

@router.get("/invoices")
def get_all_invoices(
    student_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    school_id = current_user.get("school_id")
    query = (
        db.query(FeeInvoice, User, Class, FeeStructure)
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .outerjoin(FeeStructure, FeeInvoice.fee_structure_id == FeeStructure.id)
    )
    if school_id:
        query = query.filter(FeeInvoice.school_id == school_id)
    if student_id:
        query = query.filter(FeeInvoice.student_id == student_id)
    # Parent can only see their linked children's invoices
    if current_user.get("role") == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
        if not parent:
            return {"success": True, "invoices": []}
        child_ids = [s.id for s in db.query(Student.id).filter(Student.parent_id == parent.id).all()]
        if not child_ids:
            return {"success": True, "invoices": []}
        query = query.filter(FeeInvoice.student_id.in_(child_ids))
    rows = query.order_by(FeeInvoice.created_at.desc()).all()
    return {
        "success": True,
        "invoices": [
            invoice_row(
                inv,
                student_name=u.name,
                class_name=c.name if c else "—",
                fee_type=fs.fee_type.value if fs and hasattr(fs.fee_type, 'value') else (fs.fee_type if fs else "other"),
            )
            for inv, u, c, fs in rows
        ],
    }


@router.post("/invoices", status_code=201)
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    invoice = FeeInvoice(
        invoice_number=generate_invoice_number(),
        student_id=body.student_id,
        fee_structure_id=body.fee_structure_id,
        fee_type=body.fee_type,
        amount=body.amount,
        total_amount=body.amount,
        due_date=body.due_date,
        month=body.month,
        academic_year=body.academic_year,
        school_id=current_user.get("school_id"),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"success": True, "invoice": {"id": invoice.id, "invoice_number": invoice.invoice_number}}


# ─── Parent: auto-generate + list all pending fees ────────────

def _get_structures_for_student(student: Student, db: Session) -> list:
    """Return applicable fee structures: class-specific overrides school default."""
    school_defaults = {
        (s.fee_type.value if hasattr(s.fee_type, 'value') else str(s.fee_type)): s
        for s in db.query(FeeStructure).filter(
            FeeStructure.class_id == None, FeeStructure.is_active == True
        ).all()
    }
    if student.class_id:
        for s in db.query(FeeStructure).filter(
            FeeStructure.class_id == student.class_id, FeeStructure.is_active == True
        ).all():
            school_defaults[s.fee_type.value if hasattr(s.fee_type, 'value') else str(s.fee_type)] = s
    return list(school_defaults.values())


def _make_invoice(student: Student, struct: FeeStructure, month: str, academic_year: str, db: Session) -> FeeInvoice:
    """Create an invoice from a fee structure."""
    from datetime import date as date_cls
    now = date_cls.today()
    day = min(int(struct.due_date or 10), 28)
    # Set due date to the specific month if a month label is provided (e.g. "March 2026")
    if month:
        try:
            month_date = datetime.strptime(month, "%B %Y")
            due = date_cls(month_date.year, month_date.month, day)
        except ValueError:
            due = date_cls(now.year, now.month, day)
    else:
        due = date_cls(now.year, now.month, day)

    # Check student override amount
    ft = struct.fee_type.value if hasattr(struct.fee_type, 'value') else str(struct.fee_type)
    override = db.query(StudentFeeOverride).filter(
        StudentFeeOverride.student_id == student.id,
        StudentFeeOverride.fee_type == ft,
        StudentFeeOverride.is_active == True,
    ).first()
    amount = float(override.amount) if override else float(struct.amount)

    inv = FeeInvoice(
        invoice_number=generate_invoice_number(),
        student_id=student.id,
        fee_structure_id=struct.id,
        fee_type=ft,
        amount=amount,
        late_fee=0,
        total_amount=amount,
        due_date=due,
        month=month,
        academic_year=academic_year,
        is_paid=False,
    )
    db.add(inv)
    return inv


@router.get("/parent-pending")
def get_parent_pending(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns all unpaid invoices for the parent's children.
    Auto-generates invoices from fee structures if they don't exist yet
    (monthly = current month, one-time = once ever).
    """
    if current_user.get("role") != "parent":
        raise HTTPException(status_code=403, detail="Parents only")

    parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
    if not parent:
        return {"success": True, "pending": [], "paid": []}

    children = (
        db.query(Student)
        .filter(Student.parent_id == parent.id, Student.is_active == True)
        .all()
    )
    if not children:
        return {"success": True, "pending": [], "paid": []}

    now = datetime.now()
    current_month   = now.strftime("%B %Y")          # "February 2026"
    academic_year   = f"{now.year}-{str(now.year + 1)[2:]}"  # "2026-27"
    ONE_TIME_TYPES  = {"admission", "annual", "exam"}

    for child in children:
        structures = _get_structures_for_student(child, db)
        for struct in structures:
            ft = struct.fee_type.value if hasattr(struct.fee_type, 'value') else str(struct.fee_type)

            if ft in ONE_TIME_TYPES:
                # One-time: create once ever
                exists = db.query(FeeInvoice).filter(
                    FeeInvoice.student_id == child.id,
                    FeeInvoice.fee_type == ft,
                ).first()
                if not exists:
                    _make_invoice(child, struct, None, academic_year, db)

            else:
                # Recurring (monthly, transport, other):
                # Auto-generate for all 12 months of the current year
                from datetime import date as date_cls
                for m in range(1, 13):
                    month_label = date_cls(now.year, m, 1).strftime("%B %Y")
                    exists = db.query(FeeInvoice).filter(
                        FeeInvoice.student_id == child.id,
                        FeeInvoice.fee_type == ft,
                        FeeInvoice.month == month_label,
                    ).first()
                    if not exists:
                        _make_invoice(child, struct, month_label, academic_year, db)

    db.commit()

    # Now fetch all invoices for these children
    child_ids = [c.id for c in children]
    rows = (
        db.query(FeeInvoice, User, Class, FeeStructure)
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .outerjoin(FeeStructure, FeeInvoice.fee_structure_id == FeeStructure.id)
        .filter(FeeInvoice.student_id.in_(child_ids))
        .order_by(FeeInvoice.is_paid, FeeInvoice.due_date)
        .all()
    )

    all_invoices = [
        invoice_row(
            inv, u.name,
            c.name if c else "—",
            fs.fee_type.value if fs and hasattr(fs.fee_type, 'value') else (fs.fee_type if fs else "other"),
        )
        for inv, u, c, fs in rows
    ]

    return {
        "success": True,
        "pending": [i for i in all_invoices if not i["is_paid"]],
        "paid":    [i for i in all_invoices if i["is_paid"]],
    }


# ─── Get Single Invoice ───────────────────────────────────────

@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = (
        db.query(FeeInvoice, User, Class, FeeStructure)
        .join(Student, FeeInvoice.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .outerjoin(FeeStructure, FeeInvoice.fee_structure_id == FeeStructure.id)
        .filter(FeeInvoice.id == invoice_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv, u, c, fs = row
    # Parent can only see their children's invoices
    if current_user.get("role") == "parent":
        parent = db.query(Parent).filter(Parent.user_id == current_user["user_id"]).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Access denied")
        child_ids = [s.id for s in db.query(Student.id).filter(Student.parent_id == parent.id).all()]
        if inv.student_id not in child_ids:
            raise HTTPException(status_code=403, detail="Access denied")
    ft = fs.fee_type.value if fs and hasattr(fs.fee_type, "value") else (fs.fee_type if fs else "other")
    return {"success": True, "invoice": invoice_row(inv, u.name, c.name if c else "—", ft)}


# ─── Delete Invoice ───────────────────────────────────────────

@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    for p in payments:
        db.delete(p)
    db.flush()
    db.delete(invoice)
    db.commit()
    return {"success": True}


# ─── Student Fee Overrides ────────────────────────────────────

@router.get("/student-overrides")
def get_student_overrides(
    student_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(StudentFeeOverride, User).join(
        Student, StudentFeeOverride.student_id == Student.id
    ).join(User, Student.user_id == User.id).filter(StudentFeeOverride.is_active == True)
    if student_id:
        query = query.filter(StudentFeeOverride.student_id == student_id)
    rows = query.order_by(StudentFeeOverride.student_id, StudentFeeOverride.fee_type).all()
    return {
        "success": True,
        "overrides": [
            {
                "id": o.id,
                "student_id": o.student_id,
                "student_name": u.name,
                "fee_type": o.fee_type.value if hasattr(o.fee_type, 'value') else o.fee_type,
                "fee_type_label": FEE_TYPE_LABELS.get(
                    o.fee_type.value if hasattr(o.fee_type, 'value') else o.fee_type, str(o.fee_type)
                ),
                "amount": float(o.amount),
                "academic_year": o.academic_year,
                "reason": o.reason,
            }
            for o, u in rows
        ],
    }


@router.post("/student-overrides", status_code=201)
def create_student_override(
    body: StudentFeeOverrideCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    # If same student + fee_type + year exists, update it
    existing = db.query(StudentFeeOverride).filter(
        StudentFeeOverride.student_id == body.student_id,
        StudentFeeOverride.fee_type == body.fee_type,
        StudentFeeOverride.academic_year == body.academic_year,
        StudentFeeOverride.is_active == True,
    ).first()
    if existing:
        existing.amount = body.amount
        existing.reason = body.reason
        db.commit()
        return {"success": True, "updated": True, "id": existing.id}

    override = StudentFeeOverride(
        student_id=body.student_id,
        fee_type=body.fee_type,
        amount=body.amount,
        academic_year=body.academic_year,
        reason=body.reason,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return {"success": True, "updated": False, "id": override.id}


@router.delete("/student-overrides/{override_id}")
def delete_student_override(
    override_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    o = db.query(StudentFeeOverride).filter(StudentFeeOverride.id == override_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Override not found")
    o.is_active = False
    db.commit()
    return {"success": True}


@router.get("/resolve")
def resolve_fee(
    student_id: int,
    fee_type: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the effective fee amount for a student + fee_type.
    Priority: student override > class default fee structure.
    """
    # 1. Check student-specific override
    override = db.query(StudentFeeOverride).filter(
        StudentFeeOverride.student_id == student_id,
        StudentFeeOverride.fee_type == fee_type,
        StudentFeeOverride.is_active == True,
    ).first()
    if override:
        return {
            "success": True,
            "amount": float(override.amount),
            "source": "student_override",
            "override_id": override.id,
            "structure_id": None,
        }

    # 2. Fall back to class default
    student = db.query(Student).filter(Student.id == student_id).first()
    if student and student.class_id:
        structure = db.query(FeeStructure).filter(
            FeeStructure.class_id == student.class_id,
            FeeStructure.fee_type == fee_type,
            FeeStructure.is_active == True,
        ).first()
        if structure:
            return {
                "success": True,
                "amount": float(structure.amount),
                "source": "class_default",
                "override_id": None,
                "structure_id": structure.id,
            }

    # 3. School-wide default (class_id=None)
    structure = db.query(FeeStructure).filter(
        FeeStructure.class_id == None,
        FeeStructure.fee_type == fee_type,
        FeeStructure.is_active == True,
    ).first()
    if structure:
        return {
            "success": True,
            "amount": float(structure.amount),
            "source": "school_default",
            "override_id": None,
            "structure_id": structure.id,
        }

    return {"success": True, "amount": None, "source": "none", "override_id": None, "structure_id": None}


ACADEMIC_MONTHS = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MARCH']


def generate_receipt():
    return f"RCP-{int(time.time()) % 1000000:06d}"


# ─── Mark Invoice Paid ────────────────────────────────────────

@router.patch("/invoices/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    body: MarkPaidRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.is_paid:
        raise HTTPException(status_code=400, detail="Invoice already paid")

    try:
        method = PaymentMethod(body.payment_method)
    except ValueError:
        method = PaymentMethod.cash

    payment = Payment(
        invoice_id=invoice.id,
        student_id=invoice.student_id,
        amount=invoice.total_amount,
        payment_method=method,
        status=PaymentStatus.completed,
        paid_at=datetime.utcnow(),
        receipt_number=generate_receipt(),
    )
    db.add(payment)
    invoice.is_paid = True
    db.commit()
    db.refresh(payment)
    return {"success": True, "receipt_number": payment.receipt_number}


# ─── Collect Fee (create invoice + mark paid in one step) ─────

@router.post("/collect", status_code=201)
def collect_fee(
    body: CollectFeeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    student = db.query(Student).filter(Student.id == body.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    user = db.query(User).filter(User.id == student.user_id).first()

    due = body.due_date or date_type.today()

    invoice = FeeInvoice(
        invoice_number=generate_invoice_number(),
        student_id=body.student_id,
        fee_type=body.fee_type,
        amount=body.amount,
        total_amount=body.amount,
        due_date=due,
        month=body.month,
        academic_year=body.academic_year,
        is_paid=True,
        school_id=current_user.get("school_id"),
    )
    db.add(invoice)
    db.flush()

    try:
        method = PaymentMethod(body.payment_method)
    except ValueError:
        method = PaymentMethod.cash

    payment = Payment(
        invoice_id=invoice.id,
        student_id=body.student_id,
        amount=body.amount,
        payment_method=method,
        status=PaymentStatus.completed,
        paid_at=datetime.utcnow(),
        receipt_number=generate_receipt(),
    )
    db.add(payment)
    db.commit()

    return {
        "success": True,
        "invoice_number": invoice.invoice_number,
        "receipt_number": payment.receipt_number,
        "student_name": user.name if user else "Unknown",
    }


# ─── Paid/Unpaid Status ───────────────────────────────────────

@router.get("/paid-unpaid")
def get_paid_unpaid(
    month: str = None,
    class_id: int = None,
    academic_year: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    school_id = current_user.get("school_id")
    student_query = (
        db.query(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .filter(Student.is_active == True)
    )
    if school_id:
        student_query = student_query.filter(User.school_id == school_id)
    if class_id:
        student_query = student_query.filter(Student.class_id == class_id)
    students = student_query.order_by(Class.name, User.name).all()

    inv_query = db.query(FeeInvoice).filter(FeeInvoice.fee_type == FeeType.monthly)
    if school_id:
        inv_query = inv_query.filter(FeeInvoice.school_id == school_id)
    if academic_year:
        # include invoices that match the year OR have no year set (backward compat)
        inv_query = inv_query.filter(
            or_(FeeInvoice.academic_year == academic_year, FeeInvoice.academic_year == None)
        )
    if month:
        inv_query = inv_query.filter(func.upper(FeeInvoice.month) == month.upper())
    all_invoices = inv_query.all()

    inv_map = {}
    for inv in all_invoices:
        if inv.student_id not in inv_map:
            inv_map[inv.student_id] = {}
        if inv.month:
            inv_map[inv.student_id][inv.month.upper()] = inv

    months_to_check = [month.upper()] if month else ACADEMIC_MONTHS
    result = []
    total_paid_count = 0
    total_unpaid_count = 0
    total_outstanding = 0.0

    for s, u, c in students:
        student_invoices = inv_map.get(s.id, {})
        months_detail = []
        for m in months_to_check:
            inv = student_invoices.get(m)
            if inv:
                months_detail.append({
                    "month": m,
                    "status": "paid" if inv.is_paid else "unpaid",
                    "amount": float(inv.total_amount),
                    "invoice_id": inv.id,
                })
                if inv.is_paid:
                    total_paid_count += 1
                else:
                    total_unpaid_count += 1
                    total_outstanding += float(inv.total_amount)
            else:
                months_detail.append({"month": m, "status": "no_invoice", "amount": 0, "invoice_id": None})

        total_paid_amt = sum(d["amount"] for d in months_detail if d["status"] == "paid")
        outstanding = sum(d["amount"] for d in months_detail if d["status"] == "unpaid")

        result.append({
            "student_id": s.id,
            "student_name": u.name,
            "class_name": c.name if c else "—",
            "roll_number": s.roll_number or "—",
            "months": months_detail,
            "total_paid": total_paid_amt,
            "outstanding": outstanding,
        })

    return {
        "success": True,
        "students": result,
        "summary": {
            "total_students": len(result),
            "total_paid_count": total_paid_count,
            "total_unpaid_count": total_unpaid_count,
            "total_outstanding": total_outstanding,
        },
    }


# ─── Yearly Report ────────────────────────────────────────────

@router.get("/yearly-report/{student_id}")
def get_yearly_report(
    student_id: int,
    academic_year: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    row = (
        db.query(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .outerjoin(Class, Student.class_id == Class.id)
        .filter(Student.id == student_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    s, u, c = row

    inv_query = db.query(FeeInvoice).filter(FeeInvoice.student_id == student_id)
    if academic_year:
        inv_query = inv_query.filter(
            or_(FeeInvoice.academic_year == academic_year, FeeInvoice.academic_year == None)
        )
    all_invoices = inv_query.all()

    monthly_map = {}
    for inv in all_invoices:
        ft = inv.fee_type.value if hasattr(inv.fee_type, 'value') else inv.fee_type
        if ft == "monthly" and inv.month:
            monthly_map[inv.month.upper()] = inv

    monthly_details = []
    total_monthly_paid = 0.0
    total_monthly_due = 0.0
    for m in ACADEMIC_MONTHS:
        inv = monthly_map.get(m)
        if inv:
            amount = float(inv.total_amount)
            monthly_details.append({
                "month": m,
                "status": "paid" if inv.is_paid else "unpaid",
                "amount": amount,
                "invoice_id": inv.id,
            })
            if inv.is_paid:
                total_monthly_paid += amount
            else:
                total_monthly_due += amount
        else:
            monthly_details.append({"month": m, "status": "no_invoice", "amount": 0, "invoice_id": None})

    def fee_sum(fee_type_val):
        return sum(
            float(inv.total_amount)
            for inv in all_invoices
            if (inv.fee_type.value if hasattr(inv.fee_type, 'value') else inv.fee_type) == fee_type_val and inv.is_paid
        )

    annual_paid = fee_sum("annual")
    admission_paid = fee_sum("admission")
    exam_paid = fee_sum("exam")
    transport_paid = fee_sum("transport")
    other_paid = fee_sum("other")

    return {
        "success": True,
        "student_id": s.id,
        "student_name": u.name,
        "class_name": c.name if c else "—",
        "roll_number": s.roll_number or "—",
        "academic_year": academic_year,
        "monthly_details": monthly_details,
        "totals": {
            "monthly_paid": total_monthly_paid,
            "monthly_due": total_monthly_due,
            "annual_paid": annual_paid,
            "admission_paid": admission_paid,
            "exam_paid": exam_paid,
            "transport_paid": transport_paid,
            "other_paid": other_paid,
            "grand_total": total_monthly_paid + annual_paid + admission_paid + exam_paid + transport_paid + other_paid,
        },
    }


# Keep old paths for backward compat
@router.get("/")
def get_fees_compat(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return get_fee_structures(db=db, current_user=current_user)

@router.post("/structure", status_code=201)
def create_fee_structure_compat(body: FeeStructureCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_super_admin)):
    return create_fee_structure(body=body, db=db, current_user=current_user)

@router.post("/invoice", status_code=201)
def create_invoice_compat(body: InvoiceCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    return create_invoice(body=body, db=db, current_user=current_user)
