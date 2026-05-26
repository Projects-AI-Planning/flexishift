"""Derive ISO country code and currency from an E.164 phone number."""

from __future__ import annotations

try:
    import phonenumbers
    from phonenumbers import geocoder
    _PHONENUMBERS_AVAILABLE = True
except ImportError:
    _PHONENUMBERS_AVAILABLE = False

# Country (ISO 3166-1 alpha-2) → ISO 4217 currency code
_COUNTRY_CURRENCY: dict[str, str] = {
    "GB": "GBP",
    "US": "USD",
    "CA": "CAD",
    "AU": "AUD",
    "NZ": "NZD",
    "SG": "SGD",
    "HK": "HKD",
    "JP": "JPY",
    "IN": "INR",
    "PK": "PKR",
    "BD": "BDT",
    "LK": "LKR",
    "NG": "NGN",
    "GH": "GHS",
    "KE": "KES",
    "ZA": "ZAR",
    "AE": "AED",
    "SA": "SAR",
    "QA": "QAR",
    "KW": "KWD",
    "BH": "BHD",
    "OM": "OMR",
    "EG": "EGP",
    "MA": "MAD",
    "NG": "NGN",
    "TZ": "TZS",
    "UG": "UGX",
    "ET": "ETB",
    "MX": "MXN",
    "BR": "BRL",
    "AR": "ARS",
    "CL": "CLP",
    "CO": "COP",
    "PE": "PEN",
    "TR": "TRY",
    "IL": "ILS",
    "TH": "THB",
    "MY": "MYR",
    "ID": "IDR",
    "PH": "PHP",
    "VN": "VND",
    "CN": "CNY",
    "KR": "KRW",
    "TW": "TWD",
    "CH": "CHF",
    "SE": "SEK",
    "NO": "NOK",
    "DK": "DKK",
    "PL": "PLN",
    "CZ": "CZK",
    "HU": "HUF",
    "RO": "RON",
    "RU": "RUB",
    "UA": "UAH",
    # Euro-zone countries all map to EUR
    "DE": "EUR", "FR": "EUR", "ES": "EUR", "IT": "EUR",
    "NL": "EUR", "BE": "EUR", "AT": "EUR", "FI": "EUR",
    "IE": "EUR", "PT": "EUR", "GR": "EUR", "LU": "EUR",
    "SK": "EUR", "SI": "EUR", "EE": "EUR", "LV": "EUR",
    "LT": "EUR", "CY": "EUR", "MT": "EUR", "HR": "EUR",
}

_DEFAULT_COUNTRY = "GB"
_DEFAULT_CURRENCY = "GBP"


def phone_to_country_currency(phone: str | None) -> tuple[str, str]:
    """Return (country_alpha2, currency_code) derived from a phone number.

    Falls back to ("GB", "GBP") when the number is absent, unparseable,
    or the country is not in our currency map.
    """
    if not phone or not _PHONENUMBERS_AVAILABLE:
        return _DEFAULT_COUNTRY, _DEFAULT_CURRENCY

    try:
        parsed = phonenumbers.parse(phone, None)
        country = geocoder.region_code_for_number(parsed).upper()
        currency = _COUNTRY_CURRENCY.get(country, _DEFAULT_CURRENCY)
        if not country:
            return _DEFAULT_COUNTRY, _DEFAULT_CURRENCY
        return country, currency
    except Exception:
        return _DEFAULT_COUNTRY, _DEFAULT_CURRENCY
