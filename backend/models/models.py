from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric,
    DateTime, Date, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    parent = "parent"
    student = "student"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"

class PaymentMethod(str, enum.Enum):
    jazzcash = "jazzcash"
    easypaisa = "easypaisa"
    bank_transfer = "bank_transfer"
    cash = "cash"

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    leave = "leave"

class FeeType(str, enum.Enum):
    monthly = "monthly"
    admission = "admission"
    annual = "annual"
    exam = "exam"
    transport = "transport"
    other = "other"


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, nullable=True)  # stores user_id of creator (no FK to avoid circular ref)
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.parent)
    phone = Column(String(20))
    address = Column(Text)
    profile_image = Column(String(500))
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    teacher = relationship("Teacher", back_populates="user", uselist=False)
    parent = relationship("Parent", back_populates="user", uselist=False)
    student = relationship("Student", back_populates="user", uselist=False)
    admin = relationship("Admin", back_populates="user", uselist=False)


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    grade = Column(String(10), nullable=False)
    section = Column(String(5), default="A")
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    capacity = Column(Integer, default=30)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    students = relationship("Student", back_populates="class_")
    teacher = relationship("Teacher", back_populates="classes")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(20), unique=True)
    qualification = Column(String(100))
    subject = Column(String(100))
    joining_date = Column(Date)
    salary = Column(Numeric(10, 2))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="teacher")
    classes = relationship("Class", back_populates="teacher")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    employee_id = Column(String(20), unique=True)
    designation = Column(String(100), default="Administrator")
    department = Column(String(100))
    joining_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="admin")


class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    occupation = Column(String(100))
    cnic = Column(String(15), unique=True)
    emergency_contact = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="parent")
    students = relationship("Student", back_populates="parent")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    roll_number = Column(String(20), unique=True)
    admission_number = Column(String(20), unique=True)
    link_code = Column(String(10), unique=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    parent_id = Column(Integer, ForeignKey("parents.id"))
    father_name = Column(String(100))
    address = Column(Text)
    date_of_birth = Column(Date)
    gender = Column(String(10))
    blood_group = Column(String(5))
    admission_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="student")
    class_ = relationship("Class", back_populates="students")
    parent = relationship("Parent", back_populates="students")
    fee_invoices = relationship("FeeInvoice", back_populates="student")
    fee_overrides = relationship("StudentFeeOverride", back_populates="student")
    attendance = relationship("Attendance", back_populates="student")
    marks = relationship("Mark", back_populates="student")


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    fee_type = Column(Enum(FeeType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Integer, default=10)
    late_fee_per_day = Column(Numeric(8, 2), default=0)
    academic_year = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class FeeInvoice(Base):
    __tablename__ = "fee_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(30), unique=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id"))
    fee_type = Column(Enum(FeeType), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    late_fee = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    month = Column(String(20))
    academic_year = Column(String(10))
    is_paid = Column(Boolean, default=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="fee_invoices")
    payments = relationship("Payment", back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("fee_invoices.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    transaction_id = Column(String(100), unique=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    paid_at = Column(DateTime)
    receipt_number = Column(String(30))
    gateway_response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("FeeInvoice", back_populates="payments")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"))
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    marked_by = Column(Integer, ForeignKey("teachers.id"))
    remarks = Column(Text)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="attendance")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"))
    subject = Column(String(100), nullable=False)
    exam_type = Column(String(50), nullable=False)
    total_marks = Column(Integer, nullable=False)
    obtained_marks = Column(Integer, nullable=False)
    grade = Column(String(5))
    remarks = Column(Text)
    exam_date = Column(Date)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="marks")


class SchoolSettings(Base):
    __tablename__ = "school_settings"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, unique=True)
    school_name = Column(String(200), default="My School")
    tagline = Column(String(300))
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    logo_base64 = Column(Text)          # base64 encoded image
    logo_mime = Column(String(50))      # image/png, image/jpeg etc
    academic_year = Column(String(20))
    admin_permissions = Column(Text)   # JSON: which nav pages regular admins can access
    # JazzCash Payment Gateway (Merchant API)
    jazzcash_merchant_id = Column(String(100))
    jazzcash_password = Column(String(100))
    jazzcash_integrity_salt = Column(String(100))
    jazzcash_is_sandbox = Column(Boolean, default=True)
    jazzcash_enabled = Column(Boolean, default=False)
    # JazzCash Manual Transfer (personal/business JazzCash number)
    jazzcash_number = Column(String(20))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StudentFeeOverride(Base):
    """Super admin sets a custom fee for a specific student (overrides class default)."""
    __tablename__ = "student_fee_overrides"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    fee_type = Column(Enum(FeeType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    academic_year = Column(String(10), nullable=False)
    reason = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="fee_overrides")


class Homework(Base):
    __tablename__ = "homeworks"

    id          = Column(Integer, primary_key=True, index=True)
    teacher_id  = Column(Integer, ForeignKey("teachers.id"))
    class_id    = Column(Integer, ForeignKey("classes.id"))
    subject     = Column(String(100), nullable=False)
    title       = Column(String(200), nullable=False)
    description = Column(Text)
    due_date    = Column(Date, nullable=False)
    file_name   = Column(String(200))
    file_data   = Column(Text)
    file_mime   = Column(String(100))
    school_id   = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())

    teacher = relationship("Teacher", foreign_keys=[teacher_id])
    class_  = relationship("Class",   foreign_keys=[class_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(200))
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
