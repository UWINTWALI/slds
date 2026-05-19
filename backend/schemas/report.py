from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ReportSubmit(BaseModel):
    report_type: str = Field(..., pattern="^(sector|district|publication)$")
    title: str
    district: Optional[str] = None
    sector: Optional[str] = None
    html_content: str
    payload: Optional[Dict[str, Any]] = None
    # For district reports: optionally target a specific national_admin recipient
    target_recipient_id: Optional[str] = None


class MinistryRecipient(BaseModel):
    id: str
    full_name: str
    email: str
    title: Optional[str] = None
    ministry: Optional[str] = None


class SenderInfo(BaseModel):
    id: str
    full_name: str
    email: str
    title: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    roles: List[str] = []


class ReportSummary(BaseModel):
    id: str
    reference_no: str
    report_type: str
    title: str
    district: Optional[str] = None
    sector: Optional[str] = None
    status: str
    created_at: datetime
    read_at: Optional[datetime] = None
    sender: SenderInfo
    is_inbox: bool = False


class ReportDetail(ReportSummary):
    html_content: str
    payload: Optional[Dict[str, Any]] = None


class ReportSubmitResponse(BaseModel):
    id: str
    reference_no: str
    message: str
    recipients_notified: int


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    report_id: str
    reference_no: str
    report_type: str
    sender: SenderInfo


class UnreadCount(BaseModel):
    count: int
