"""Small read-only fetch helper for allowlisted public metadata hosts."""

from __future__ import annotations

from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

ALLOWED_HOSTS = frozenset({"raw.githubusercontent.com", "raw.github.com"})
USER_AGENT = "open-market-research-mcp/0.2.0"


def _allowed(url: str, allowed_hosts: frozenset[str]) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme == "https"
        and bool(parsed.netloc)
        and not parsed.username
        and not parsed.password
        and parsed.hostname in allowed_hosts
    )


class _AllowlistRedirects(HTTPRedirectHandler):
    def __init__(self, allowed_hosts: frozenset[str]):
        super().__init__()
        self.allowed_hosts = allowed_hosts

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _allowed(newurl, self.allowed_hosts):
            raise ValueError("Metadata redirect target is not on the allowlist")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_public_text(
    url: str,
    *,
    allowed_hosts: frozenset[str] = ALLOWED_HOSTS,
    max_bytes: int = 500_000,
    timeout: int = 20,
) -> str:
    """Fetch a public allowlisted URL with scheme, host, and size checks.

    This never accepts credentials, private hostnames, or non-HTTPS URLs. It is
    intentionally not a general-purpose crawler.
    """
    if not _allowed(url, allowed_hosts):
        raise ValueError("Only allowlisted absolute HTTPS URLs without credentials are allowed")
    request = Request(url, headers={"User-Agent": USER_AGENT})
    opener = build_opener(_AllowlistRedirects(allowed_hosts))
    with opener.open(request, timeout=timeout) as response:
        contents = response.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise ValueError(f"Metadata response exceeds {max_bytes} bytes")
    return contents.decode("utf-8")
