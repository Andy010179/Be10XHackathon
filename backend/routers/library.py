from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from io import BytesIO
from database import db
from helpers import serialize_doc, ifilter
from dependencies import get_current_user, require_admin
import base64

library_router = APIRouter(prefix="/library", tags=["library"])

ALLOWED_TYPES = {"book", "video", "url"}


@library_router.get("")
async def list_library_items(
    user: dict = Depends(get_current_user),
    type: str = None,
    category: str = None,
):
    q = ifilter(user)
    if type:
        q["type"] = type
    if category:
        q["category"] = category
    items = await db.library.find(q, {"file_data": 0}).sort("created_at", -1).to_list(500)
    return [serialize_doc(i) for i in items]


@library_router.post("")
async def add_library_item(
    title: str = Form(...),
    type: str = Form(...),
    category: str = Form("General"),
    description: str = Form(""),
    url: str = Form(""),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user),
):
    if user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only admins and teachers can add library items")
    if type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {', '.join(ALLOWED_TYPES)}")

    file_data = None
    file_size = 0
    if file and file.filename:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File must be under 10 MB")
        file_data = base64.b64encode(content).decode()
        file_size = len(content)

    doc = {
        "title": title, "type": type, "category": category,
        "description": description, "url": url,
        "has_file": bool(file_data), "file_size": file_size,
        "file_data": file_data,
        "institute_id": user.get("institute_id"),
        "created_by": user.get("name", ""),
        "created_by_role": user.get("role", ""),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.library.insert_one(doc)
    doc.pop("file_data", None)
    return serialize_doc({**doc, "_id": result.inserted_id})


@library_router.delete("/{item_id}")
async def delete_library_item(item_id: str, user: dict = Depends(require_admin)):
    res = await db.library.delete_one(ifilter(user, {"_id": ObjectId(item_id)}))
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}


@library_router.get("/{item_id}/download")
async def download_library_file(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.library.find_one(ifilter(user, {"_id": ObjectId(item_id)}))
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not item.get("file_data"):
        raise HTTPException(status_code=404, detail="No file attached to this item")

    content = base64.b64decode(item["file_data"])
    safe_name = item.get("title", "file").replace(" ", "_")
    return StreamingResponse(
        BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.pdf"}
    )
