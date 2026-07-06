from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ValidationError
from typing import Optional
import re


class RegisterRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: str
    country: Optional[str] = None
    currency: Optional[str] = None
    organisation_number: Optional[str] = Field(None, alias="organisationNumber")
    vat_number: Optional[str] = Field(None, alias="vatNumber")
    company_name: Optional[str] = Field(None, alias="companyName")
    address: Optional[str] = None
    esignature_data: Optional[str] = Field(None, alias="esignatureData")
    organisation_doc_url: Optional[str] = Field(None, alias="organisationDocUrl")

    model_config = {"populate_by_name": True}

    def get_name(self) -> str:
        return self.name or self.full_name or ""

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ("DRIVER", "HAULIER", "FIRM"):
            raise ValueError("Role must be DRIVER, HAULIER, or FIRM")
        return v

    @model_validator(mode="after")
    def validate_phone_number_by_country(self) -> "RegisterRequest":
        if not self.phone:
            return self

        import phonenumbers
        from phonenumbers import geocoder

        default_region = (self.country or "GB").upper()

        try:
            parsed = phonenumbers.parse(self.phone, default_region)
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError.from_exception_data(
                    self.__class__.__name__,
                    [{
                        "type": "value_error",
                        "loc": ("body", "phone"),
                        "input": self.phone,
                        "ctx": {"error": ValueError("Please enter a valid phone number.")}
                    }]
                )

            detected_region = geocoder.region_code_for_number(parsed)

            if self.country:
                expected_calling_code = phonenumbers.country_code_for_region(self.country.upper())
                if parsed.country_code != expected_calling_code:
                    raise ValidationError.from_exception_data(
                        self.__class__.__name__,
                        [{
                            "type": "value_error",
                            "loc": ("body", "phone"),
                            "input": self.phone,
                            "ctx": {"error": ValueError(f"Phone number does not match the selected country {self.country.upper()}.")}
                        }]
                    )
            else:
                if detected_region:
                    self.country = detected_region.upper()

            # Normalize to E.164
            self.phone = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError.from_exception_data(
                self.__class__.__name__,
                [{
                    "type": "value_error",
                    "loc": ("body", "phone"),
                    "input": self.phone,
                    "ctx": {"error": ValueError(str(e) or "Invalid phone number format.")}
                }]
            )

        return self


class VerifyEmailRequest(BaseModel):
    token: Optional[str] = None
    otp: Optional[str] = None
    email: Optional[str] = None

    def get_token(self) -> str:
        return self.token or self.otp or ""

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().lower()
        return cleaned or None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    expected_role: Optional[str] = Field(None, alias="expectedRole")

    model_config = {"populate_by_name": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., alias="refreshToken")

    model_config = {"populate_by_name": True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., alias="newPassword")

    model_config = {"populate_by_name": True}

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("new_password", mode="before")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")
    old_password: Optional[str] = None

    model_config = {"populate_by_name": True}

    def get_current_password(self) -> str:
        return self.current_password or self.old_password or ""
