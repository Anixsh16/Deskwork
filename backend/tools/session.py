"""Test helper: a real Supabase session for an allowed teacher, without typing a password.

Uses the service key to issue a one-time sign-in link for the teacher's account (creating the account
if it does not exist yet; it links to the same user when they later sign in with Google).

  uv run python -m tools.session token          prints an access token for API tests
  uv run python -m tools.session link           prints a browser sign-in URL for the local app
"""

import sys

import httpx

from app.config import get_settings


def _email() -> str:
    return sorted(get_settings().allowed_emails)[0]


def _admin(client: httpx.Client) -> dict:
    s = get_settings()
    return {"apikey": s.supabase_secret_key, "Authorization": f"Bearer {s.supabase_secret_key}"}


def _hashed_token(client: httpx.Client, email: str) -> str:
    s = get_settings()
    headers = _admin(client)
    r = client.post(f"{s.supabase_url}/auth/v1/admin/generate_link", headers=headers,
                    json={"type": "magiclink", "email": email})
    if r.status_code == 404 or (r.status_code >= 400 and "not found" in r.text.lower()):
        client.post(f"{s.supabase_url}/auth/v1/admin/users", headers=headers,
                    json={"email": email, "email_confirm": True}).raise_for_status()
        r = client.post(f"{s.supabase_url}/auth/v1/admin/generate_link", headers=headers,
                        json={"type": "magiclink", "email": email})
    r.raise_for_status()
    data = r.json()
    return data.get("hashed_token") or data["properties"]["hashed_token"]


def access_token() -> str:
    s = get_settings()
    with httpx.Client(timeout=30) as client:
        token_hash = _hashed_token(client, _email())
        r = client.post(f"{s.supabase_url}/auth/v1/verify", headers={"apikey": s.supabase_publishable_key},
                        json={"type": "magiclink", "token_hash": token_hash})
        r.raise_for_status()
        return r.json()["access_token"]


def signin_link() -> str:
    with httpx.Client(timeout=30) as client:
        token_hash = _hashed_token(client, _email())
    return f"{get_settings().frontend_origin}/auth/confirm?token_hash={token_hash}&type=magiclink"


if __name__ == "__main__":
    print(signin_link() if sys.argv[1:] == ["link"] else access_token())
