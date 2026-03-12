"""
Image hashing utilities for perceptual duplicate detection.
Uses multiple hashing algorithms for robust similarity matching.
"""

from typing import Dict, Optional, Tuple
from PIL import Image
import imagehash
import numpy as np


class ImageHasher:
    """
    Generates and compares perceptual hashes for images.
    Uses multiple hash types for more accurate duplicate detection.
    """
    
    HASH_SIZE = 16
    
    def __init__(self):
        self._hash_cache: Dict[str, Dict[str, imagehash.ImageHash]] = {}
    
    def compute_hashes(self, image: Image.Image, image_id: str) -> Dict[str, str]:
        """
        Compute multiple perceptual hashes for an image.
        
        Returns dict with hash types as keys and hex strings as values.
        """
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        hashes = {
            'phash': imagehash.phash(image, hash_size=self.HASH_SIZE),
            'dhash': imagehash.dhash(image, hash_size=self.HASH_SIZE),
            'ahash': imagehash.average_hash(image, hash_size=self.HASH_SIZE),
            'whash': imagehash.whash(image, hash_size=self.HASH_SIZE)
        }
        
        self._hash_cache[image_id] = hashes
        
        return {k: str(v) for k, v in hashes.items()}
    
    def get_cached_hashes(self, image_id: str) -> Optional[Dict[str, imagehash.ImageHash]]:
        """Get cached hashes for an image ID."""
        return self._hash_cache.get(image_id)
    
    def compute_hash_from_hex(self, hex_string: str) -> imagehash.ImageHash:
        """Convert a hex string back to an ImageHash object."""
        return imagehash.hex_to_hash(hex_string)
    
    def compare_hashes(
        self, 
        hash1: Dict[str, str], 
        hash2: Dict[str, str]
    ) -> Dict[str, int]:
        """
        Compare two sets of hashes and return the differences.
        Lower difference = more similar images.
        """
        differences = {}
        
        for hash_type in ['phash', 'dhash', 'ahash', 'whash']:
            if hash_type in hash1 and hash_type in hash2:
                h1 = self.compute_hash_from_hex(hash1[hash_type])
                h2 = self.compute_hash_from_hex(hash2[hash_type])
                differences[hash_type] = h1 - h2
        
        return differences
    
    def compute_similarity_score(
        self, 
        hash1: Dict[str, str], 
        hash2: Dict[str, str]
    ) -> float:
        """
        Compute an overall similarity score between two images.
        Returns a value between 0 (identical) and 100 (completely different).
        
        Uses weighted average of different hash types.
        """
        differences = self.compare_hashes(hash1, hash2)
        
        if not differences:
            return 100.0
        
        weights = {
            'phash': 0.35,
            'dhash': 0.30,
            'ahash': 0.20,
            'whash': 0.15
        }
        
        max_diff = self.HASH_SIZE * self.HASH_SIZE
        
        weighted_score = 0.0
        total_weight = 0.0
        
        for hash_type, diff in differences.items():
            if hash_type in weights:
                normalized_diff = (diff / max_diff) * 100
                weighted_score += normalized_diff * weights[hash_type]
                total_weight += weights[hash_type]
        
        if total_weight > 0:
            return round(weighted_score / total_weight, 2)
        
        return 100.0
    
    def are_duplicates(
        self, 
        hash1: Dict[str, str], 
        hash2: Dict[str, str],
        threshold: int = 8
    ) -> Tuple[bool, float]:
        """
        Determine if two images are duplicates based on hash comparison.
        
        Args:
            hash1: First image's hashes
            hash2: Second image's hashes
            threshold: Maximum hash difference to consider as duplicate
            
        Returns:
            Tuple of (is_duplicate, similarity_score)
        """
        differences = self.compare_hashes(hash1, hash2)
        
        if not differences:
            return False, 100.0
        
        phash_diff = differences.get('phash', float('inf'))
        dhash_diff = differences.get('dhash', float('inf'))
        
        is_duplicate = phash_diff <= threshold or dhash_diff <= threshold
        
        similarity_score = self.compute_similarity_score(hash1, hash2)
        
        return is_duplicate, similarity_score
    
    def clear_cache(self):
        """Clear the hash cache."""
        self._hash_cache.clear()
    
    def remove_from_cache(self, image_id: str):
        """Remove a specific image from the cache."""
        self._hash_cache.pop(image_id, None)


hasher = ImageHasher()
