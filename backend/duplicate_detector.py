"""
Duplicate detection engine that coordinates image hashing and comparison.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import uuid

from PIL import Image

from hashing import hasher
from image_utils import (
    get_image_info,
    compute_image_quality_score,
    resize_for_comparison
)


HASH_THRESHOLD = 8


class DuplicateStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


@dataclass
class ImageRecord:
    """Represents a stored image with its metadata and hashes."""
    id: str
    filename: str
    filepath: str
    thumbnail_path: str
    width: int
    height: int
    format: str
    file_size: int
    quality_score: float
    hashes: Dict[str, str]
    uploaded_at: datetime = field(default_factory=datetime.now)


@dataclass
class DuplicatePair:
    """Represents a potential duplicate pair."""
    id: str
    image1_id: str
    image2_id: str
    similarity_score: float
    hash_differences: Dict[str, int]
    status: DuplicateStatus = DuplicateStatus.PENDING
    detected_at: datetime = field(default_factory=datetime.now)


class DuplicateDetector:
    """
    Main engine for detecting and managing duplicate images.
    Processes images in batches and maintains a cache of hashes.
    """
    
    def __init__(self, threshold: int = HASH_THRESHOLD):
        self.threshold = threshold
        self.images: Dict[str, ImageRecord] = {}
        self.duplicate_pairs: Dict[str, DuplicatePair] = {}
        self._processing_stats = {
            "total_processed": 0,
            "duplicates_found": 0,
            "confirmed_duplicates": 0,
            "rejected_pairs": 0
        }
    
    def add_image(
        self,
        image: Image.Image,
        filename: str,
        filepath: str,
        thumbnail_path: str,
        file_size: int
    ) -> ImageRecord:
        """
        Add an image to the detection system.
        Computes hashes and stores metadata.
        """
        image_id = str(uuid.uuid4())
        
        comparison_image = resize_for_comparison(image)
        
        hashes = hasher.compute_hashes(comparison_image, image_id)
        
        info = get_image_info(image)
        quality = compute_image_quality_score(image)
        
        record = ImageRecord(
            id=image_id,
            filename=filename,
            filepath=filepath,
            thumbnail_path=thumbnail_path,
            width=info["width"],
            height=info["height"],
            format=info["format"],
            file_size=file_size,
            quality_score=quality,
            hashes=hashes
        )
        
        self.images[image_id] = record
        self._processing_stats["total_processed"] += 1
        
        return record
    
    def find_duplicates(self, batch_size: int = 100) -> List[DuplicatePair]:
        """
        Find all duplicate pairs among stored images.
        Processes in batches for memory efficiency.
        """
        new_pairs = []
        image_ids = list(self.images.keys())
        
        existing_pair_keys = {
            frozenset([p.image1_id, p.image2_id]) 
            for p in self.duplicate_pairs.values()
        }
        
        for i in range(0, len(image_ids), batch_size):
            batch = image_ids[i:i + batch_size]
            
            for j, id1 in enumerate(batch):
                for id2 in image_ids[i + j + 1:]:
                    if frozenset([id1, id2]) in existing_pair_keys:
                        continue
                    
                    pair = self._compare_images(id1, id2)
                    if pair:
                        new_pairs.append(pair)
                        existing_pair_keys.add(frozenset([id1, id2]))
        
        return new_pairs
    
    def _compare_images(self, id1: str, id2: str) -> Optional[DuplicatePair]:
        """Compare two images and create a duplicate pair if similar."""
        img1 = self.images.get(id1)
        img2 = self.images.get(id2)
        
        if not img1 or not img2:
            return None
        
        is_dup, similarity = hasher.are_duplicates(
            img1.hashes, 
            img2.hashes, 
            self.threshold
        )
        
        if is_dup:
            differences = hasher.compare_hashes(img1.hashes, img2.hashes)
            
            pair_id = str(uuid.uuid4())
            pair = DuplicatePair(
                id=pair_id,
                image1_id=id1,
                image2_id=id2,
                similarity_score=similarity,
                hash_differences=differences
            )
            
            self.duplicate_pairs[pair_id] = pair
            self._processing_stats["duplicates_found"] += 1
            
            return pair
        
        return None
    
    def get_pending_pairs(self) -> List[DuplicatePair]:
        """Get all duplicate pairs pending user review."""
        return [
            pair for pair in self.duplicate_pairs.values()
            if pair.status == DuplicateStatus.PENDING
        ]
    
    def get_all_pairs(self) -> List[DuplicatePair]:
        """Get all duplicate pairs."""
        return list(self.duplicate_pairs.values())
    
    def confirm_duplicate(self, pair_id: str, action: str) -> Optional[DuplicatePair]:
        """
        Process user confirmation for a duplicate pair.
        
        Actions:
        - "confirm": Mark as confirmed duplicate
        - "reject": Mark as not a duplicate
        """
        pair = self.duplicate_pairs.get(pair_id)
        
        if not pair:
            return None
        
        if action == "confirm":
            pair.status = DuplicateStatus.CONFIRMED
            self._processing_stats["confirmed_duplicates"] += 1
        elif action == "reject":
            pair.status = DuplicateStatus.REJECTED
            self._processing_stats["rejected_pairs"] += 1
        
        return pair
    
    def delete_image(self, image_id: str) -> bool:
        """
        Remove an image and its associated duplicate pairs.
        """
        if image_id not in self.images:
            return False
        
        del self.images[image_id]
        
        pairs_to_remove = [
            pid for pid, pair in self.duplicate_pairs.items()
            if pair.image1_id == image_id or pair.image2_id == image_id
        ]
        
        for pid in pairs_to_remove:
            del self.duplicate_pairs[pid]
        
        hasher.remove_from_cache(image_id)
        
        return True
    
    def get_image(self, image_id: str) -> Optional[ImageRecord]:
        """Get an image record by ID."""
        return self.images.get(image_id)
    
    def get_all_images(self) -> List[ImageRecord]:
        """Get all stored images."""
        return list(self.images.values())
    
    def get_stats(self) -> Dict:
        """Get processing statistics."""
        return {
            **self._processing_stats,
            "total_images": len(self.images),
            "pending_reviews": len(self.get_pending_pairs()),
            "threshold": self.threshold
        }
    
    def clear_all(self):
        """Clear all images and duplicate pairs."""
        self.images.clear()
        self.duplicate_pairs.clear()
        hasher.clear_cache()
        self._processing_stats = {
            "total_processed": 0,
            "duplicates_found": 0,
            "confirmed_duplicates": 0,
            "rejected_pairs": 0
        }
    
    def set_threshold(self, threshold: int):
        """Update the duplicate detection threshold."""
        self.threshold = threshold


detector = DuplicateDetector()
