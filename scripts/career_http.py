"""Bounded HTTPS transport for authenticated maintenance scripts. Never follows redirects."""
import json
import re
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_BYTES = 1_048_576


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Authenticated redirect rejected')


def validate_origin(origin):
    if not isinstance(origin, str) or re.search(r'[\s\x00-\x1f\x7f\\]', origin):
        raise ValueError('Secure HTTPS origin required')
    try:
        url = urlsplit(origin)
        port = url.port
    except ValueError:
        raise ValueError('Secure HTTPS origin required') from None
    if (url.scheme != 'https' or not url.hostname or url.username is not None
            or url.password is not None or url.path or url.query or url.fragment
            or '?' in origin or '#' in origin or (port is not None and port < 1)):
        raise ValueError('Secure HTTPS origin required')
    return origin


def request(origin, path, *, method='GET', body=None, token=None, timeout=30,
            user_agent='CareerOS-Maintenance/1.0'):
    validate_origin(origin)
    if not isinstance(path, str) or not path.startswith('/') or path.startswith('//') or re.search(r'[\x00-\x20\x7f\\#]', path):
        raise ValueError('Origin-relative API path required')
    if token is not None and (not isinstance(token, str) or not token.strip() or re.search(r'[\x00-\x20\x7f]', token)):
        raise ValueError('Secure authentication required')
    if not 0 < timeout <= 30:
        raise ValueError('Bounded timeout required')
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': user_agent}
    if token is not None:
        headers['Authorization'] = 'Bearer ' + token
    wire = json.dumps(body).encode() if body is not None else None
    req = Request(origin + path, data=wire, method=method, headers=headers)
    try:
        response = build_opener(NoRedirect()).open(req, timeout=timeout)
    except HTTPError as error:
        response = error
    # Bound error bodies as well as successful responses; callers retain status contracts.
    with response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('Response exceeds size limit')
        status = response.code if isinstance(response, HTTPError) else response.status
        try:
            value = json.loads(data)
        except (ValueError, UnicodeError):
            value = {'non_json': True}
        return status, value
