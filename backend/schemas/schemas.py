from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    teacher = "teacher"
    parent = "parent"
    student = "student"

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.parent
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Student Schemas
class StudentCreate(BaseModel):
    name: str
    email: Optional[str] = None   # optional — auto-generated if blank
    password: Optional[str] = None  # optional — auto-generated if blank
    phone: Optional[str] = None
    father_name: Optional[str] = None
    address: Optional[str] = None
    roll_number: Optional[str] = None  # auto-generated if not provided
    class_id: int
    parent_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    admission_date: Optional[date] = None

class StudentUpdate(BaseModel):
    class_id: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    father_name: Optional[str] = None
    address: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    roll_number: Optional[str]
    admission_number: Optional[str]
    gender: Optional[str]
    is_active: bool
    name: Optional[str]
    email: Optional[str]
    class_name: Optional[str] = None
    grade: Optional[str] = None

    class Config:
        from_attributes = True

# Fee Schemas
class FeeStructureCreate(BaseModel):
    class_id: Optional[int] = None
    fee_type: str
    amount: float
    due_date: int = 10
    late_fee_per_day: float = 0
    academic_year: str

class DefaultFeeStructureCreate(BaseModel):
    fee_type: str
    amount: float
    due_date: int = 10
    late_fee_per_day: float = 0
    academic_year: str

class StudentFeeOverrideCreate(BaseModel):
    student_id: int
    fee_type: str
    amount: float
    academic_year: str
    reason: Optional[str] = None

class InvoiceCreate(BaseModel):
    student_id: int
    fee_structure_id: Optional[int] = None
    fee_type: Optional[str] = None
    amount: float
    due_date: date
    month: Optional[str] = None
    academic_year: Optional[str] = None

# Payment Schemas
class PaymentInitiate(BaseModel):
    invoice_id: int
    student_id: int
    amount: float
    payment_method: str
    phone_number: Optional[str] = None

# Attendance Schemas
class AttendanceRecord(BaseModel):
    student_id: int
    class_id: Optional[int] = None
    date: date
    status: str
    marked_by: Optional[int] = None
    remarks: Optional[str] = None

class AttendanceBulk(BaseModel):
    records: list[AttendanceRecord]

# Marks Schemas
class MarkCreate(BaseModel):
    student_id: int
    class_id: Optional[int] = None
    subject: str
    exam_type: str
    total_marks: int
    obtained_marks: int
    exam_date: Optional[date] = None
    remarks: Optional[str] = None

# Message Schemas
class MessageCreate(BaseModel):
    receiver_id: int
    subject: Optional[str] = None
    message: str

# Collect Fee Schema
class CollectFeeRequest(BaseModel):
    student_id: int
    fee_type: str
    amount: float
    month: Optional[str] = None
    academic_year: Optional[str] = None
    payment_method: str = "cash"
    due_date: Optional[date] = None

class MarkPaidRequest(BaseModel):
    payment_method: str = "cash"
