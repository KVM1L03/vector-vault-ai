from fastapi import HTTPException, Request

from app.core.clients import get_redis

RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end
local ttl = redis.call('TTL', key)
if count > limit then
    return {0, ttl}
end
return {1, ttl}
"""


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_rate_limit(
    key: str,
    limit: int = 20,
    window_seconds: int = 60,
) -> None:
    redis = get_redis()
    result = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, limit, window_seconds)
    allowed, ttl = result
    if allowed == 0:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {ttl} seconds.",
        )


async def rate_limit_ask(request: Request) -> None:
    ip = get_client_ip(request)
    await check_rate_limit(f"rl:ask:{ip}", limit=20, window_seconds=60)


async def rate_limit_upload(request: Request) -> None:
    ip = get_client_ip(request)
    await check_rate_limit(f"rl:upload:{ip}", limit=5, window_seconds=60)