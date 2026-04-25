import boto3
from botocore.exceptions import ClientError

from app.config import settings

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
    return _s3


def generate_presigned_upload(bucket: str, key: str, content_type: str, expires: int = 300) -> dict:
    client = _client()
    url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )
    return {"upload_url": url, "key": key}


def generate_presigned_download(bucket: str, key: str, expires: int = 3600) -> str:
    client = _client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    _client().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def delete_object(bucket: str, key: str) -> None:
    try:
        _client().delete_object(Bucket=bucket, Key=key)
    except ClientError:
        pass
