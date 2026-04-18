from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from helpers import get_razorpay_keys
from dependencies import get_current_user
from models import OrderCreate, PaymentVerify
import uuid
import logging

logger = logging.getLogger(__name__)

payments_router = APIRouter(prefix="/payments", tags=["payments"])


@payments_router.post("/create-order")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"_id": ObjectId(data.invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    amount_paise = int(data.amount * 100)
    rzp_key_id, rzp_key_secret = await get_razorpay_keys()
    if rzp_key_id and rzp_key_secret:
        try:
            import razorpay as rzp
            rz_client = rzp.Client(auth=(rzp_key_id, rzp_key_secret))
            receipt = f"rcpt_{data.invoice_id[:20]}"
            order = rz_client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1, "receipt": receipt})
            return {"order_id": order["id"], "amount": amount_paise, "currency": "INR", "key": rzp_key_id, "mock": False}
        except Exception as e:
            logger.error(f"Razorpay error: {e}")
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:16]}"
    return {"order_id": mock_order_id, "amount": amount_paise, "currency": "INR", "key": "rzp_test_demo", "mock": True}


@payments_router.post("/verify")
async def verify_payment(data: PaymentVerify, user: dict = Depends(get_current_user)):
    verified = False
    rzp_key_id, rzp_key_secret = await get_razorpay_keys()
    if rzp_key_id and rzp_key_secret and data.signature and not data.order_id.startswith("order_mock_"):
        try:
            import razorpay as rzp
            rz_client = rzp.Client(auth=(rzp_key_id, rzp_key_secret))
            rz_client.utility.verify_payment_signature({
                "razorpay_order_id": data.order_id,
                "razorpay_payment_id": data.payment_id,
                "razorpay_signature": data.signature
            })
            verified = True
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
    else:
        verified = True
    if verified:
        invoice = await db.invoices.find_one({"_id": ObjectId(data.invoice_id)})
        if invoice:
            new_paid = invoice.get("paid_amount", 0) + data.amount
            new_balance = max(0, invoice.get("total", 0) - new_paid)
            new_status = "paid" if new_balance <= 0 else "partial"
            await db.invoices.update_one(
                {"_id": ObjectId(data.invoice_id)},
                {"$set": {"paid_amount": new_paid, "balance": new_balance, "status": new_status}}
            )
            await db.payments.insert_one({
                "invoice_id": data.invoice_id, "payment_id": data.payment_id,
                "order_id": data.order_id, "amount": data.amount,
                "method": "razorpay", "created_at": datetime.now(timezone.utc)
            })
        return {"success": True, "payment_id": data.payment_id, "message": "Payment recorded successfully"}
    raise HTTPException(status_code=400, detail="Payment verification failed")
