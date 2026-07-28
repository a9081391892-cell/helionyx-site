#!/usr/bin/env python3
import json
import os
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

CDEK_API = "https://api.cdek.ru"
CLIENT_ID = os.environ.get("CDEK_CLIENT_ID", "").strip()
CLIENT_SECRET = os.environ.get("CDEK_CLIENT_SECRET", "").strip()
HOST = os.environ.get("HELIONYX_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("HELIONYX_API_PORT", "8787"))

_token = {"value": "", "expires_at": 0.0}
_token_lock = threading.Lock()
_cache = {}
_cache_lock = threading.Lock()
_requests = defaultdict(deque)
_requests_lock = threading.Lock()


class ApiError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def cache_get(key):
    with _cache_lock:
        item = _cache.get(key)
        if not item or item["expires_at"] <= time.time():
            _cache.pop(key, None)
            return None
        return item["value"]


def cache_set(key, value, ttl=900):
    with _cache_lock:
        _cache[key] = {"value": value, "expires_at": time.time() + ttl}


def get_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        raise ApiError("CDEK API is not configured", 503)

    with _token_lock:
        if _token["value"] and _token["expires_at"] > time.time() + 60:
            return _token["value"]

        body = urlencode({
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }).encode("utf-8")
        request = Request(
            CDEK_API + "/v2/oauth/token",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "HELIONYX/1.0",
            },
        )
        try:
            with urlopen(request, timeout=12) as response:
                payload = json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            raise ApiError("Не удалось авторизоваться в СДЭК") from error

        token = payload.get("access_token")
        if not token:
            raise ApiError("СДЭК не вернул токен авторизации")
        _token["value"] = token
        _token["expires_at"] = time.time() + int(payload.get("expires_in", 3600))
        return token


def cdek_get(path, params):
    url = CDEK_API + path + "?" + urlencode(params, doseq=True)
    request = Request(
        url,
        method="GET",
        headers={
            "Authorization": "Bearer " + get_token(),
            "Accept": "application/json",
            "User-Agent": "HELIONYX/1.0",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            return json.load(response)
    except HTTPError as error:
        if error.code == 401:
            with _token_lock:
                _token["value"] = ""
                _token["expires_at"] = 0
        raise ApiError("СДЭК временно не отвечает на запрос") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ApiError("Не удалось получить данные СДЭК") from error



def search_cities(query):
    cache_key = "cities:" + query.casefold()
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    cities = cdek_get("/v2/location/cities", {
        "country_codes": "RU",
        "city": query,
        "size": 20,
    })
    if not isinstance(cities, list):
        raise ApiError("СДЭК вернул некорректный список населённых пунктов")

    results = []
    seen = set()
    for item in cities:
        code = item.get("code")
        name = item.get("city")
        if not code or not name or code in seen:
            continue
        seen.add(code)
        results.append({
            "code": code,
            "name": name,
            "region": item.get("region") or "",
            "sub_region": item.get("sub_region") or "",
            "postal_codes": item.get("postal_codes") or [],
        })

    cache_set(cache_key, results, 86400)
    return results

def resolve_city(city_name):
    cache_key = "city:" + city_name.casefold()
    cached = cache_get(cache_key)
    if cached:
        return cached

    cities = cdek_get("/v2/location/cities", {
        "country_codes": "RU",
        "city": city_name,
        "size": 20,
    })
    if not isinstance(cities, list) or not cities:
        raise ApiError("Город не найден в справочнике СДЭК", 404)

    normalized = city_name.casefold().replace("ё", "е")
    city = next(
        (
            item for item in cities
            if str(item.get("city", "")).casefold().replace("ё", "е") == normalized
        ),
        cities[0],
    )
    result = {
        "code": city.get("code"),
        "name": city.get("city"),
        "region": city.get("region"),
    }
    if not result["code"]:
        raise ApiError("У города отсутствует код СДЭК", 502)
    cache_set(cache_key, result, 86400)
    return result


def pickup_points(city_name="", city_code=None):
    if city_code is not None:
        try:
            normalized_code = int(city_code)
        except (TypeError, ValueError) as error:
            raise ApiError("Некорректный код населённого пункта СДЭК", 400) from error
        city = {"code": normalized_code, "name": city_name, "region": ""}
    else:
        city = resolve_city(city_name)

    cache_key = "pvz:" + str(city["code"])
    cached = cache_get(cache_key)
    if cached:
        return {"city": city, "points": cached}

    raw_points = cdek_get("/v2/deliverypoints", {
        "city_code": city["code"],
        "type": "ALL",
        "lang": "rus",
    })
    if not isinstance(raw_points, list):
        raise ApiError("СДЭК вернул некорректный список ПВЗ")

    points = []
    for point in raw_points:
        if not point.get("is_handout", True):
            continue
        location = point.get("location") or point.get("address") or {}
        address = (
            location.get("address_full")
            or location.get("address")
            or point.get("address")
            or ""
        )
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        coordinates = point.get("coordinates") or {}
        if latitude is None:
            latitude = coordinates.get("latitude")
        if longitude is None:
            longitude = coordinates.get("longitude")
        points.append({
            "code": point.get("code"),
            "name": point.get("name") or "Пункт СДЭК",
            "address": address,
            "type": point.get("type") or "PVZ",
            "work_time": point.get("work_time") or "",
            "latitude": latitude,
            "longitude": longitude,
        })

    points.sort(key=lambda item: (item["address"] or "", item["code"] or ""))
    cache_set(cache_key, points, 1800)
    return {"city": city, "points": points}


def rate_limited(ip):
    now = time.time()
    with _requests_lock:
        queue = _requests[ip]
        while queue and queue[0] < now - 60:
            queue.popleft()
        if len(queue) >= 30:
            return True
        queue.append(now)
        return False


class Handler(BaseHTTPRequestHandler):
    server_version = "HELIONYX"
    sys_version = ""

    def send_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(200, {
                "ok": True,
                "service": "helionyx-api",
                "cdek_configured": bool(CLIENT_ID and CLIENT_SECRET),
            })
            return

        if parsed.path not in ("/api/cdek/cities", "/api/cdek/offices"):
            self.send_json(404, {"error": "Not found"})
            return

        client_ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if rate_limited(client_ip):
            self.send_json(429, {"error": "Слишком много запросов. Попробуйте через минуту."})
            return

        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/api/cdek/cities":
                search = (query.get("q") or [""])[0].strip()
                if len(search) < 2 or len(search) > 100:
                    self.send_json(400, {"error": "Введите не менее двух букв."})
                    return
                self.send_json(200, {"cities": search_cities(search)})
                return

            city_name = (query.get("city") or [""])[0].strip()
            city_code = (query.get("city_code") or [""])[0].strip()
            if city_code:
                self.send_json(200, pickup_points(city_name, city_code))
                return
            if len(city_name) < 2 or len(city_name) > 100:
                self.send_json(400, {"error": "Выберите населённый пункт."})
                return
            self.send_json(200, pickup_points(city_name))
        except ApiError as error:
            self.send_json(error.status, {"error": str(error)})
        except Exception:
            self.send_json(500, {"error": "Внутренняя ошибка сервера."})

    def do_POST(self):
        self.send_json(405, {"error": "Method not allowed"})

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("HELIONYX API listening on %s:%s" % (HOST, PORT), flush=True)
    server.serve_forever()
