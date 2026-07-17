from datetime import datetime, timezone, timedelta

from azure.storage.blob import (
    BlobServiceClient,
    BlobSasPermissions,
    generate_blob_sas,
)
from azure.core.exceptions import ResourceNotFoundError

from app.config import settings

_blob_service: BlobServiceClient | None = None


def _client() -> BlobServiceClient:
    global _blob_service
    if _blob_service is None:
        conn_str = (
            f"DefaultEndpointsProtocol=https;"
            f"AccountName={settings.AZURE_STORAGE_ACCOUNT_NAME};"
            f"AccountKey={settings.AZURE_STORAGE_ACCOUNT_KEY};"
            f"EndpointSuffix=core.windows.net"
        )
        _blob_service = BlobServiceClient.from_connection_string(conn_str)
    return _blob_service


def _blob_url(container: str, blob_name: str) -> str:
    return (
        f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}"
        f".blob.core.windows.net/{container}/{blob_name}"
    )


def generate_presigned_upload(container: str, blob_name: str, content_type: str, expires: int = 300) -> dict:
    sas_token = generate_blob_sas(
        account_name=settings.AZURE_STORAGE_ACCOUNT_NAME,
        container_name=container,
        blob_name=blob_name,
        account_key=settings.AZURE_STORAGE_ACCOUNT_KEY,
        permission=BlobSasPermissions(write=True, create=True),
        expiry=datetime.now(timezone.utc) + timedelta(seconds=expires),
        content_type=content_type,
    )
    url = f"{_blob_url(container, blob_name)}?{sas_token}"
    return {"url": url, "upload_url": url, "key": blob_name}


def generate_presigned_download(container: str, blob_name: str, expires: int = 3600) -> str:
    sas_token = generate_blob_sas(
        account_name=settings.AZURE_STORAGE_ACCOUNT_NAME,
        container_name=container,
        blob_name=blob_name,
        account_key=settings.AZURE_STORAGE_ACCOUNT_KEY,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(seconds=expires),
    )
    return f"{_blob_url(container, blob_name)}?{sas_token}"


def upload_bytes(container: str, blob_name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    blob_client = _client().get_blob_client(container=container, blob=blob_name)
    blob_client.upload_blob(data, overwrite=True, content_settings=_content_settings(content_type))
    return _blob_url(container, blob_name)


def delete_object(container: str, blob_name: str) -> None:
    try:
        blob_client = _client().get_blob_client(container=container, blob=blob_name)
        blob_client.delete_blob()
    except ResourceNotFoundError:
        pass


def _content_settings(content_type: str):
    from azure.storage.blob import ContentSettings
    return ContentSettings(content_type=content_type)
