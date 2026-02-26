import hmac
import hashlib
import json
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Payment, FeeInvoice, Student, User, SchoolSettings, PaymentStatus, PaymentMethod
from schemas import PaymentInitiate
from auth import get_current_user, require_admin
import httpx

router = APIRouter(prefix="/api/payments", tags=["Payments"])

JAZZCASH_SANDBOX_URL  = "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase"
JAZZCASH_PROD_URL     = "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase"


@router.get("/methods")
def get_payment_methods(db: Session = Depends(get_db)):
    """Public endpoint — returns which payment methods are available."""
    s = db.query(SchoolSettings).first()
    # Show JazzCash as soon as admin enables it — credential errors appear at payment time
    jazzcash_ok = bool(s and s.jazzcash_enabled)
    return {"jazzcash": jazzcash_ok, "cash": True}


def generate_receipt() -> str:
    return f"RCP-{str(int(time.time()))[-6:]}"


def _compute_jazzcash_hash(params: dict, integrity_salt: str) -> str:
    """HMAC-SHA256 hash as required by JazzCash: salt + sorted non-empty values."""
    sorted_values = [
        str(v)
        for k, v in sorted(params.items())
        if str(v) != "" and k != "pp_SecureHash"
    ]
    hash_string = integrity_salt + "".join(f"&{v}" for v in sorted_values)
    return hmac.new(
        integrity_salt.encode("utf-8"),
        hash_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().upper()


def _get_jazzcash_config(db: Session) -> dict:
    """Fetch and validate JazzCash credentials from DB."""
    s = db.query(SchoolSettings).first()
    if not s or not s.jazzcash_enabled:
        raise HTTPException(
            status_code=400,
            detail="JazzCash payments are not enabled. Please contact the school admin.",
        )
    if not s.jazzcash_merchant_id or not s.jazzcash_password or not s.jazzcash_integrity_salt:
        raise HTTPException(
            status_code=503,
            detail="JazzCash is not fully configured. Please contact the school admin.",
        )
    return {
        "merchant_id":    s.jazzcash_merchant_id,
        "password":       s.jazzcash_password,
        "integrity_salt": s.jazzcash_integrity_salt,
        "api_url":        JAZZCASH_SANDBOX_URL if s.jazzcash_is_sandbox else JAZZCASH_PROD_URL,
        "is_sandbox":     s.jazzcash_is_sandbox,
    }


@router.post("/jazzcash/initiate")
def jazzcash_initiate(
    body: PaymentInitiate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == body.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.is_paid:
        raise HTTPException(status_code=400, detail="This invoice is already paid")

    if not body.phone_number:
        raise HTTPException(status_code=400, detail="JazzCash mobile number is required")

    cfg = _get_jazzcash_config(db)

    # Build transaction params
    now          = datetime.now()
    txn_datetime = now.strftime("%Y%m%d%H%M%S")
    expiry       = (now + timedelta(minutes=30)).strftime("%Y%m%d%H%M%S")
    txn_ref      = f"T{txn_datetime}{invoice.id}"
    amount_paisa = str(int(float(body.amount) * 100))

    params = {
        "pp_Version":            "1.1",
        "pp_TxnType":            "MWALLET",
        "pp_Language":           "EN",
        "pp_MerchantID":         cfg["merchant_id"],
        "pp_SubMerchantID":      "",
        "pp_Password":           cfg["password"],
        "pp_BankID":             "TBANK",
        "pp_ProductID":          "RETL",
        "pp_TxnRefNo":           txn_ref,
        "pp_Amount":             amount_paisa,
        "pp_TxnCurrency":        "PKR",
        "pp_TxnDateTime":        txn_datetime,
        "pp_BillReference":      f"INV{invoice.id}",
        "pp_Description":        f"School Fee Payment - Invoice {invoice.invoice_number}",
        "pp_TxnExpiryDateTime":  expiry,
        "ppmpf_1":               body.phone_number,
        "ppmpf_2":               "",
        "ppmpf_3":               "",
        "ppmpf_4":               "",
        "ppmpf_5":               "",
    }
    params["pp_SecureHash"] = _compute_jazzcash_hash(params, cfg["integrity_salt"])

    # Create pending payment record
    payment = Payment(
        invoice_id=body.invoice_id,
        student_id=body.student_id,
        amount=body.amount,
        payment_method=PaymentMethod.jazzcash,
        transaction_id=txn_ref,
        status=PaymentStatus.pending,
        receipt_number=generate_receipt(),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Call JazzCash API
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(cfg["api_url"], json=params)
        gw_data = resp.json()
    except Exception as e:
        payment.status = PaymentStatus.failed
        payment.gateway_response = json.dumps({"error": str(e)})
        db.commit()
        raise HTTPException(status_code=502, detail="Could not connect to JazzCash. Please try again.")

    response_code = gw_data.get("pp_ResponseCode", "")
    response_msg  = gw_data.get("pp_ResponseMessage", "Payment failed")

    payment.gateway_response = json.dumps(gw_data)

    if response_code == "000":
        # Successful
        payment.status  = PaymentStatus.completed
        payment.paid_at = datetime.utcnow()
        invoice.is_paid = True
        db.commit()
        return {
            "success":        True,
            "status":         "completed",
            "receipt_number": payment.receipt_number,
            "message":        "Payment successful! Fee has been marked as paid.",
        }
    elif response_code == "157":
        # Pending — customer needs to approve in JazzCash app
        db.commit()
        return {
            "success":        False,
            "status":         "pending",
            "transaction_id": txn_ref,
            "message":        "Payment initiated. Please approve the transaction in your JazzCash app.",
        }
    else:
        payment.status = PaymentStatus.failed
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"JazzCash Error ({response_code}): {response_msg}",
        )


@router.get("/jazzcash/status/{transaction_id}")
def jazzcash_check_status(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.transaction_id == transaction_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "status":         payment.status.value,
        "receipt_number": payment.receipt_number,
        "paid_at":        payment.paid_at.isoformat() if payment.paid_at else None,
    }


@router.post("/cash")
def cash_payment(
    body: PaymentInitiate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == body.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.is_paid:
        raise HTTPException(status_code=400, detail="This invoice is already paid")

    payment = Payment(
        invoice_id=body.invoice_id,
        student_id=body.student_id,
        amount=body.amount,
        payment_method=PaymentMethod.cash,
        status=PaymentStatus.completed,
        paid_at=datetime.utcnow(),
        receipt_number=generate_receipt(),
    )
    db.add(payment)
    invoice.is_paid = True
    db.commit()
    return {"success": True, "receipt_number": payment.receipt_number}


# ─── Manual JazzCash Transfer ─────────────────────────────────

class ManualPaymentBody(BaseModel):
    invoice_id: int
    student_id: int
    amount: float
    transaction_id: str   # JazzCash transaction reference entered by parent


@router.post("/jazzcash-manual")
def jazzcash_manual_submit(
    body: ManualPaymentBody,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Parent submits a manual JazzCash transaction reference for admin verification."""
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == body.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.is_paid:
        raise HTTPException(status_code=400, detail="This invoice is already paid")

    txn_id = body.transaction_id.strip()
    if not txn_id:
        raise HTTPException(status_code=400, detail="Transaction reference is required")

    # Check duplicate transaction ID
    existing = db.query(Payment).filter(Payment.transaction_id == txn_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This transaction reference has already been submitted")

    payment = Payment(
        invoice_id=body.invoice_id,
        student_id=body.student_id,
        amount=body.amount,
        payment_method=PaymentMethod.jazzcash,
        transaction_id=txn_id,
        status=PaymentStatus.pending,   # Needs admin verification
        receipt_number=generate_receipt(),
    )
    db.add(payment)
    db.commit()
    return {
        "success": True,
        "message": "Payment submitted. Admin will verify and confirm.",
        "receipt_number": payment.receipt_number,
    }


@router.get("/pending-verifications")
def get_pending_verifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Admin: list all manual JazzCash payments waiting for verification."""
    rows = (
        db.query(Payment, FeeInvoice, Student, User)
        .join(FeeInvoice, Payment.invoice_id == FeeInvoice.id)
        .join(Student, Payment.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .filter(
            Payment.status == PaymentStatus.pending,
            Payment.payment_method == PaymentMethod.jazzcash,
        )
        .order_by(Payment.created_at.desc())
        .all()
    )
    return {
        "success": True,
        "verifications": [
            {
                "payment_id":      p.id,
                "invoice_id":      p.invoice_id,
                "invoice_number":  inv.invoice_number,
                "student_name":    u.name,
                "amount":          float(p.amount),
                "transaction_id":  p.transaction_id,
                "submitted_at":    p.created_at.strftime("%d %b %Y %H:%M") if p.created_at else "",
                "receipt_number":  p.receipt_number,
                "month":           inv.month or "One-time",
                "fee_type":        inv.fee_type.value if hasattr(inv.fee_type, 'value') else str(inv.fee_type),
            }
            for p, inv, s, u in rows
        ],
    }


class VerifyBody(BaseModel):
    approved: bool
    note: Optional[str] = None


@router.post("/verify/{payment_id}")
def verify_payment(
    payment_id: int,
    body: VerifyBody,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Admin: approve or reject a manual JazzCash payment."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != PaymentStatus.pending:
        raise HTTPException(status_code=400, detail="Payment is not in pending state")

    if body.approved:
        payment.status  = PaymentStatus.completed
        payment.paid_at = datetime.utcnow()
        invoice = db.query(FeeInvoice).filter(FeeInvoice.id == payment.invoice_id).first()
        if invoice:
            invoice.is_paid = True
        db.commit()
        return {"success": True, "message": "Payment approved. Invoice marked as paid."}
    else:
        payment.status = PaymentStatus.failed
        db.commit()
        return {"success": True, "message": "Payment rejected."}
