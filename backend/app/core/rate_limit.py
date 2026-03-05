from fastapi import HTTPException, Request

from app.core.clients import get_redis


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
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.ttl(key)
    count, ttl = await pipe.execute()

    if ttl == -1:
        await redis.expire(key, window_seconds)

    if count > limit:
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