"""
Image utility functions for loading, saving, and manipulating images.
"""

import os
import io
import zipfile
from pathlib import Path
from typing import List, Tuple, Optional
from PIL import Image
import cv2
import numpy as np

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'}
UPLOAD_DIR = Path(__file__).parent / "uploads"
THUMBNAIL_DIR = Path(__file__).parent / "thumbnails"

UPLOAD_DIR.mkdir(exist_ok=True)
THUMBNAIL_DIR.mkdir(exist_ok=True)


def is_valid_image(filename: str) -> bool:
    """Check if a file has a supported image extension."""
    return Path(filename).suffix.lower() in SUPPORTED_EXTENSIONS


def load_image_from_bytes(data: bytes) -> Optional[Image.Image]:
    """Load a PIL Image from bytes data."""
    try:
        return Image.open(io.BytesIO(data))
    except Exception:
        return None


def load_image_from_path(path: str) -> Optional[Image.Image]:
    """Load a PIL Image from a file path."""
    try:
        return Image.open(path)
    except Exception:
        return None


def save_image(image: Image.Image, path: str) -> bool:
    """Save a PIL Image to a file path."""
    try:
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        image.save(path, quality=95)
        return True
    except Exception:
        return False


def create_thumbnail(image: Image.Image, size: Tuple[int, int] = (300, 300)) -> Image.Image:
    """Create a thumbnail of an image while maintaining aspect ratio."""
    thumb = image.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)
    return thumb


def save_thumbnail(image: Image.Image, image_id: str) -> str:
    """Save a thumbnail and return the path."""
    thumb = create_thumbnail(image)
    thumb_path = THUMBNAIL_DIR / f"{image_id}_thumb.jpg"
    
    if thumb.mode in ('RGBA', 'P'):
        thumb = thumb.convert('RGB')
    
    thumb.save(thumb_path, "JPEG", quality=85)
    return str(thumb_path)


def extract_images_from_zip(zip_data: bytes) -> List[Tuple[str, bytes]]:
    """Extract images from a ZIP archive."""
    images = []
    
    try:
        with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
            for name in zf.namelist():
                if name.startswith('__MACOSX') or name.startswith('.'):
                    continue
                    
                if is_valid_image(name):
                    try:
                        data = zf.read(name)
                        filename = Path(name).name
                        images.append((filename, data))
                    except Exception:
                        continue
    except zipfile.BadZipFile:
        pass
    
    return images


def get_image_info(image: Image.Image) -> dict:
    """Get basic information about an image."""
    return {
        "width": image.width,
        "height": image.height,
        "format": image.format or "UNKNOWN",
        "mode": image.mode,
        "size_pixels": image.width * image.height
    }


def resize_for_comparison(image: Image.Image, max_size: int = 1024) -> Image.Image:
    """Resize image for efficient comparison while maintaining aspect ratio."""
    if max(image.width, image.height) <= max_size:
        return image
    
    ratio = max_size / max(image.width, image.height)
    new_size = (int(image.width * ratio), int(image.height * ratio))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def pil_to_cv2(image: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV format (BGR)."""
    if image.mode == 'RGBA':
        image = image.convert('RGB')
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def cv2_to_pil(image: np.ndarray) -> Image.Image:
    """Convert OpenCV image (BGR) to PIL Image."""
    return Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))


def compute_image_quality_score(image: Image.Image) -> float:
    """
    Compute a simple quality score based on image properties.
    Higher score = better quality (higher resolution, more detail).
    """
    cv_img = pil_to_cv2(image)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    resolution_score = (image.width * image.height) / 1_000_000
    
    quality_score = (laplacian_var * 0.01) + (resolution_score * 10)
    
    return round(quality_score, 2)


def delete_image_files(image_id: str) -> bool:
    """Delete all files associated with an image ID."""
    try:
        for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
            img_path = UPLOAD_DIR / f"{image_id}{ext}"
            if img_path.exists():
                img_path.unlink()
                break
        
        thumb_path = THUMBNAIL_DIR / f"{image_id}_thumb.jpg"
        if thumb_path.exists():
            thumb_path.unlink()
        
        return True
    except Exception:
        return False
