"""
DupLens AI - FastAPI Backend
Main application entry point with API endpoints.
"""

import os
import io
import uuid
import zipfile
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from image_utils import (
    is_valid_image,
    load_image_from_bytes,
    save_image,
    save_thumbnail,
    extract_images_from_zip,
    delete_image_files,
    UPLOAD_DIR,
    THUMBNAIL_DIR
)
from duplicate_detector import detector, DuplicateStatus

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")]

app = FastAPI(
    title="DupLens AI",
    description="AI-powered duplicate image detection API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/thumbnails", StaticFiles(directory=str(THUMBNAIL_DIR)), name="thumbnails")


class ImageResponse(BaseModel):
    id: str
    filename: str
    width: int
    height: int
    format: str
    file_size: int
    quality_score: float
    thumbnail_url: str
    image_url: str


class DuplicatePairResponse(BaseModel):
    id: str
    image1: ImageResponse
    image2: ImageResponse
    similarity_score: float
    status: str


class ConfirmDuplicateRequest(BaseModel):
    pair_id: str
    action: str  # "confirm" or "reject"


class DeleteImageRequest(BaseModel):
    image_id: str


class UploadResponse(BaseModel):
    message: str
    uploaded_count: int
    images: List[ImageResponse]


class StatsResponse(BaseModel):
    total_images: int
    total_processed: int
    duplicates_found: int
    confirmed_duplicates: int
    rejected_pairs: int
    pending_reviews: int
    threshold: int


def image_record_to_response(record) -> ImageResponse:
    """Convert an ImageRecord to an API response."""
    return ImageResponse(
        id=record.id,
        filename=record.filename,
        width=record.width,
        height=record.height,
        format=record.format,
        file_size=record.file_size,
        quality_score=record.quality_score,
        thumbnail_url=f"/thumbnails/{record.id}_thumb.jpg",
        image_url=f"/uploads/{record.id}{Path(record.filepath).suffix}"
    )


@app.get("/")
async def root():
    """API health check endpoint."""
    return {"status": "ok", "service": "DupLens AI", "version": "1.0.0"}


@app.post("/upload-images", response_model=UploadResponse)
async def upload_images(files: List[UploadFile] = File(...)):
    """
    Upload multiple images or ZIP archives.
    Supported formats: jpg, jpeg, png, gif, bmp, webp, tiff
    """
    uploaded_images = []
    
    for file in files:
        content = await file.read()
        
        if file.filename.lower().endswith('.zip'):
            extracted = extract_images_from_zip(content)
            
            for filename, img_data in extracted:
                result = await _process_image(filename, img_data)
                if result:
                    uploaded_images.append(result)
        
        elif is_valid_image(file.filename):
            result = await _process_image(file.filename, content)
            if result:
                uploaded_images.append(result)
    
    return UploadResponse(
        message=f"Successfully uploaded {len(uploaded_images)} images",
        uploaded_count=len(uploaded_images),
        images=uploaded_images
    )


async def _process_image(filename: str, content: bytes) -> Optional[ImageResponse]:
    """Process and store a single image."""
    image = load_image_from_bytes(content)
    
    if not image:
        return None
    
    image_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower() or '.jpg'
    
    filepath = UPLOAD_DIR / f"{image_id}{ext}"
    
    if not save_image(image, str(filepath)):
        return None
    
    thumbnail_path = save_thumbnail(image, image_id)
    
    record = detector.add_image(
        image=image,
        filename=filename,
        filepath=str(filepath),
        thumbnail_path=thumbnail_path,
        file_size=len(content)
    )
    
    old_id = record.id
    record.id = image_id
    record.filepath = str(filepath)
    detector.images[image_id] = detector.images.pop(old_id)
    
    return image_record_to_response(record)


@app.get("/find-duplicates", response_model=List[DuplicatePairResponse])
async def find_duplicates(
    threshold: Optional[int] = Query(None, ge=1, le=64, description="Hash difference threshold")
):
    """
    Scan all uploaded images and find potential duplicates.
    Returns list of duplicate pairs with similarity scores.
    """
    if threshold is not None:
        detector.set_threshold(threshold)
    
    detector.find_duplicates()
    
    pairs = detector.get_all_pairs()
    
    response = []
    for pair in pairs:
        img1 = detector.get_image(pair.image1_id)
        img2 = detector.get_image(pair.image2_id)
        
        if img1 and img2:
            response.append(DuplicatePairResponse(
                id=pair.id,
                image1=image_record_to_response(img1),
                image2=image_record_to_response(img2),
                similarity_score=pair.similarity_score,
                status=pair.status.value
            ))
    
    return response


@app.get("/pending-duplicates", response_model=List[DuplicatePairResponse])
async def get_pending_duplicates():
    """Get duplicate pairs that are pending user review."""
    pairs = detector.get_pending_pairs()
    
    response = []
    for pair in pairs:
        img1 = detector.get_image(pair.image1_id)
        img2 = detector.get_image(pair.image2_id)
        
        if img1 and img2:
            response.append(DuplicatePairResponse(
                id=pair.id,
                image1=image_record_to_response(img1),
                image2=image_record_to_response(img2),
                similarity_score=pair.similarity_score,
                status=pair.status.value
            ))
    
    return response


@app.post("/confirm-duplicate")
async def confirm_duplicate(request: ConfirmDuplicateRequest):
    """
    Confirm or reject a duplicate pair.
    Actions: "confirm" or "reject"
    """
    if request.action not in ["confirm", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'confirm' or 'reject'")
    
    pair = detector.confirm_duplicate(request.pair_id, request.action)
    
    if not pair:
        raise HTTPException(status_code=404, detail="Duplicate pair not found")
    
    return {
        "message": f"Pair marked as {request.action}ed",
        "pair_id": pair.id,
        "status": pair.status.value
    }


@app.get("/images", response_model=List[ImageResponse])
async def get_all_images():
    """Get all uploaded images."""
    images = detector.get_all_images()
    return [image_record_to_response(img) for img in images]


@app.get("/images/{image_id}")
async def get_image(image_id: str):
    """Get a specific image by ID."""
    record = detector.get_image(image_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return image_record_to_response(record)


@app.delete("/images/{image_id}")
async def delete_image(image_id: str):
    """Delete an image and its associated data."""
    record = detector.get_image(image_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
    
    delete_image_files(image_id)
    detector.delete_image(image_id)
    
    return {"message": "Image deleted successfully", "image_id": image_id}


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get processing statistics."""
    stats = detector.get_stats()
    return StatsResponse(**stats)


@app.post("/clear")
async def clear_all():
    """Clear all images and reset the system."""
    for record in detector.get_all_images():
        delete_image_files(record.id)
    
    detector.clear_all()
    
    return {"message": "All data cleared successfully"}


@app.get("/image-file/{image_id}")
async def get_image_file(image_id: str):
    """Serve the actual image file."""
    record = detector.get_image(image_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not os.path.exists(record.filepath):
        raise HTTPException(status_code=404, detail="Image file not found")
    
    return FileResponse(record.filepath)


@app.get("/thumbnail/{image_id}")
async def get_thumbnail(image_id: str):
    """Serve the thumbnail image."""
    thumb_path = THUMBNAIL_DIR / f"{image_id}_thumb.jpg"
    
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    return FileResponse(str(thumb_path))


@app.get("/export-clean")
async def export_clean_images():
    """
    Export all remaining (clean) images as a ZIP file.
    Downloads only the images that haven't been deleted.
    """
    images = detector.get_all_images()
    
    if not images:
        raise HTTPException(status_code=404, detail="No images to export")
    
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for record in images:
            if os.path.exists(record.filepath):
                zip_file.write(
                    record.filepath,
                    arcname=record.filename
                )
    
    zip_buffer.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"duplens_clean_images_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
