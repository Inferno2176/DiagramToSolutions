import time
from collections import defaultdict
from threading import Lock
from typing import Tuple, Dict, List
from fastapi import HTTPException, status

class RateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Safely limits requests per client key (IP address, email address, or action).
    """
    def __init__(self):
        self._lock = Lock()
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            # Filter out entries older than window
            valid_timestamps = [t for t in self._requests[key] if t > cutoff]
            self._requests[key] = valid_timestamps

            if len(valid_timestamps) >= max_requests:
                oldest = valid_timestamps[0]
                retry_after = int(oldest + window_seconds - now) + 1
                return False, max(1, retry_after)

            self._requests[key].append(now)
            return True, 0

    def reset(self, key: str = None):
        with self._lock:
            if key:
                self._requests.pop(key, None)
            else:
                self._requests.clear()

# Global rate limiter instance
limiter = RateLimiter()

def enforce_rate_limit(key: str, max_requests: int, window_seconds: int, action_name: str = "requests"):
    allowed, retry_after = limiter.is_allowed(key, max_requests, window_seconds)
    if not allowed:
        minutes = max(1, (retry_after + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many {action_name}. Please wait approximately {minutes} minute{'s' if minutes > 1 else ''} before trying again.",
            headers={"Retry-After": str(retry_after)}
        )
