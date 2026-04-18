from pydantic import BaseModel, Field, BeforeValidator
from typing import Annotated, List, Optional, Any
from datetime import datetime


def coerce_object_id(v: Any) -> str:
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(coerce_object_id)]


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"
    branch_id: Optional[str] = None
    student_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str
    institute_code: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None
    joining_date: Optional[str] = None
    new_password: Optional[str] = None


class InstituteCreate(BaseModel):
    name: str
    code: str
    admin_name: str
    admin_email: str
    admin_password: str
    phone: Optional[str] = None
    address: Optional[str] = None


class InstituteUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class ParentInvite(BaseModel):
    parent_name: str
    parent_email: str
    parent_phone: Optional[str] = None
    student_id: str


class BranchCreate(BaseModel):
    name: str
    location: str


class CourseCreate(BaseModel):
    name: str
    category: str
    branch_id: str
    base_fee: float
    teacher_id: Optional[str] = None


class EnquiryCreate(BaseModel):
    student_name: str
    email: str
    phone: str
    courses: List[str] = []
    stage: str = "new"
    source: str = "manual"
    notes: str = ""
    city: Optional[str] = None
    address: Optional[str] = None


class StageUpdate(BaseModel):
    stage: str


class ScheduleCreate(BaseModel):
    course_id: str
    teacher_id: str
    room_id: str
    branch_id: str
    start_time: datetime
    end_time: datetime
    title: str = ""


class ScheduleUpdate(BaseModel):
    course_id: Optional[str] = None
    teacher_id: Optional[str] = None
    room_id: Optional[str] = None
    branch_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    title: Optional[str] = None


class BatchCreate(BaseModel):
    name: str
    branch_id: str
    course_id: str
    teacher_id: str
    start_time: str
    end_time: str
    days: List[str] = []


class BatchUpdate(BaseModel):
    name: Optional[str] = None
    branch_id: Optional[str] = None
    course_id: Optional[str] = None
    teacher_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days: Optional[List[str]] = None


class FeeCalculate(BaseModel):
    student_id: str
    student_name: str
    course_id: str
    course_name: str
    base_fee: float
    discount: float = 0


class StudentCreate(BaseModel):
    name: str
    email: str
    phone: str
    branch_id: Optional[str] = None
    course_ids: List[str] = []
    dob: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    course_ids: Optional[List[str]] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    notes: Optional[str] = None
    syllabus_percentage: Optional[float] = None
    id_proof: Optional[str] = None
    institute_name: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class OnboardStudent(BaseModel):
    batch_id: Optional[str] = None
    batch_ids: Optional[List[str]] = None


class AttendanceMark(BaseModel):
    session_id: str
    student_id: str
    status: str


class PaymentUpdate(BaseModel):
    amount: float


class OrderCreate(BaseModel):
    invoice_id: str
    amount: float


class PaymentVerify(BaseModel):
    invoice_id: str
    payment_id: str
    order_id: str
    signature: Optional[str] = None
    amount: float


class PersonalUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None


class FeeQuery(BaseModel):
    message: str


class RazorpaySettings(BaseModel):
    key_id: str
    key_secret: str


class TwilioSettings(BaseModel):
    account_sid: str
    auth_token: str
    phone_number: str


class PublicEnquiryCreate(BaseModel):
    student_name: str
    email: str
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    interest: str = ""
    institute_code: Optional[str] = None
