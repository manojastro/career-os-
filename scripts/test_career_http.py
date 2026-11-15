"""Local fixtures only: no production configuration or credentials are loaded."""
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, build_opener
from unittest.mock import patch


class RedirectTests(unittest.TestCase):
    def test_redirects_never_reach_target(self):
        received = []
        source_requests = []

        class Target(BaseHTTPRequestHandler):
            def do_GET(self):
                received.append(self.headers.get('Authorization'))
                self.send_response(200)
                self.end_headers()
            do_POST = do_GET
            def log_message(self, *args): pass

        target = ThreadingHTTPServer(('127.0.0.1', 0), Target)
        destination = f'http://127.0.0.1:{target.server_port}/target'

        class Source(Target):
            def do_GET(self):
                if self.path == '/target':
                    return super().do_GET()
                self.rfile.read(int(self.headers.get('Content-Length', 0)))
                source_requests.append(self.path)
                self.send_response(int(self.path.split('/')[1]))
                self.send_header('Location', '/target' if self.path.endswith('relative') else destination)
                self.end_headers()
            do_POST = do_GET

        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        for server in (target, source):
            threading.Thread(target=server.serve_forever, daemon=True).start()
            self.addCleanup(server.server_close)
            self.addCleanup(server.shutdown)
        try:
            from career_http import NoRedirect
            opener = build_opener(NoRedirect())
        except ImportError:
            # RED: exact default urllib transport used by the original installer.
            opener = build_opener()
        for code in (301, 302, 303, 307, 308):
            for location in ('absolute', 'relative'):
                for method in ('GET', 'POST'):
                    with self.subTest(code=code, location=location, method=method):
                        received.clear()
                        source_requests.clear()
                        req = Request(f'http://127.0.0.1:{source.server_port}/{code}/{location}',
                                      data=b'{}' if method == 'POST' else None, method=method,
                                      headers={'Authorization': 'Bearer fixture-only-not-a-secret'})
                        rejected = False
                        try:
                            with opener.open(req, timeout=2): pass
                        except ValueError:
                            rejected = True
                        except Exception: pass
                        self.assertEqual(received, [])
                        self.assertEqual(len(source_requests), 1)
                        self.assertTrue(rejected, 'redirect must fail closed at the source')


class ValidationTests(unittest.TestCase):
    def test_status_json_non_json_and_timeout_contract(self):
        import io
        from urllib.error import HTTPError
        from career_http import request
        for code, body, expected in ((400, b'{"error":"invalid_request"}', {'error': 'invalid_request'}),
                                     (406, b'fixture html', {'non_json': True})):
            error = HTTPError('https://example.com', code, 'fixture', {}, io.BytesIO(body))
            with patch('urllib.request.OpenerDirector.open', side_effect=error) as opened:
                self.assertEqual(request('https://example.com', '/api/test', token='fixture', timeout=20), (code, expected))
                self.assertEqual(opened.call_args.kwargs['timeout'], 20)
        for timeout in (0, -1, 31):
            with self.assertRaises(ValueError):
                request('https://example.com', '/api/test', token='fixture', timeout=timeout)
        for path in ('//other.example/path', 'https://other.example', '/bad\npath', '/bad#fragment'):
            with self.assertRaises(ValueError):
                request('https://example.com', path, token='fixture')

    def test_invalid_connection_values_rejected_before_network(self):
        from career_http import request
        for origin in ('http://example.com', 'https://u:p@example.com', 'https://example.com/path',
                       'https://example.com?x=1', 'https://example.com#x', 'https://',
                       'https://example.com\n', 'https://example.com:bad', 'https://example.com/'):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                request(origin, '/api/test', token='fixture')
        for token in ('', 'bad\nsecret', 'bad\rsecret', '   ', 'bad\x00secret'):
            with self.subTest(token=repr(token)), self.assertRaises(ValueError):
                request('https://example.com', '/api/test', token=token)

    def test_bounds_success_and_error_bodies(self):
        import io
        from urllib.error import HTTPError
        from career_http import request
        class Response(io.BytesIO):
            status = 200
        for response in (Response(b'x' * 1_048_577),
                         HTTPError('https://example.com', 400, 'fixture', {}, io.BytesIO(b'x' * 1_048_577))):
            with patch('urllib.request.OpenerDirector.open', side_effect=response if isinstance(response, HTTPError) else None,
                       return_value=response), self.assertRaises(ValueError):
                request('https://example.com', '/api/test', token='fixture')


class HealthTests(unittest.TestCase):
    def test_success_requires_json_but_http_errors_keep_status(self):
        import ast
        import io
        from pathlib import Path
        from urllib.error import HTTPError
        from urllib.parse import urlsplit
        from career_http import request
        # Load the actual wrapper alone: never execute profile/provider/health probes.
        tree = ast.parse((Path(__file__).parent / 'check_career_control_health.py').read_text(encoding='utf-8'))
        wrapper = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'call')
        scope = {'urlsplit': urlsplit, 'request': request}
        exec(compile(ast.Module(body=[wrapper], type_ignores=[]), '<health-wrapper>', 'exec'), scope)

        class Response(io.BytesIO):
            status = 200

        for response, expected in (
            (Response(b'<html>fixture login</html>'), ('unavailable', {})),
            (Response(b'{"ok":true}'), (200, {'ok': True})),
            (Response(b'{"non_json":true}'), (200, {'non_json': True})),
            (HTTPError('https://example.com', 406, 'fixture', {}, io.BytesIO(b'<html>fixture</html>')),
             (406, {'non_json': True})),
        ):
            with self.subTest(expected=expected), patch('urllib.request.OpenerDirector.open',
                    side_effect=response if isinstance(response, HTTPError) else None, return_value=response):
                self.assertEqual(scope['call']('https://example.com/api/test', token='fixture'), expected)


class InstallerTests(unittest.TestCase):
    def test_default_dry_run_keeps_profile_untouched_and_preflight_exact(self):
        import contextlib
        import io
        import json
        import os
        import runpy
        import sys
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            (home / 'cron').mkdir()
            config = b'model:\n  default: meta/muse-spark-1.3-contributor\n  provider: openrouter\n'
            jobs = b'{"jobs":[{"id":"46a628bb9ae9","enabled":false}]}'
            (home / 'config.yaml').write_bytes(config)
            (home / 'cron/jobs.json').write_bytes(jobs)
            env = {'CAREER_OS_BASE_URL': 'https://example.com', 'CAREER_OS_AGENT_TOKEN': 'fixture-' * 8,
                   'TELEGRAM_ALLOWED_USERS': '123', 'USERPROFILE': directory}
            for response, ready in (((400, {'error': 'invalid_request'}), True),
                                    ((200, {'error': 'invalid_request'}), False),
                                    ((406, {'non_json': True}), False),
                                    (ValueError('fixture redirect'), False)):
                output = io.StringIO()
                with patch.dict(os.environ, env, clear=True), patch.object(sys, 'argv', ['install', '--home', directory]), \
                     patch('career_http.request', side_effect=response if isinstance(response, Exception) else None,
                           return_value=response), contextlib.redirect_stdout(output):
                    with self.assertRaises(SystemExit) as stopped:
                        runpy.run_path(str(Path(__file__).parent / 'install_career_control.py'), run_name='__main__')
                    self.assertEqual(stopped.exception.code, 0)
                result = json.loads(output.getvalue())
                self.assertEqual(result['mode'], 'dry_run')
                self.assertEqual(result['control_api_auth_preflight'], ready)
                self.assertEqual((home / 'config.yaml').read_bytes(), config)
                self.assertEqual((home / 'cron/jobs.json').read_bytes(), jobs)
                self.assertFalse((home / 'state').exists())


if __name__ == '__main__':
    unittest.main()
