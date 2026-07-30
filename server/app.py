#!/usr/bin/env python3
import base64
import json
import math
import os
import re
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
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
PUBLIC_URL = os.environ.get("HELIONYX_PUBLIC_URL", "https://helionyx.store").rstrip("/")
DB_PATH = os.environ.get("HELIONYX_DB_PATH", "").strip()

YOOKASSA_API = "https://api.yookassa.ru/v3"
YOOKASSA_SHOP_ID = os.environ.get("YOOKASSA_SHOP_ID", "").strip()
YOOKASSA_SECRET_KEY = os.environ.get("YOOKASSA_SECRET_KEY", "").strip()
YOOKASSA_PAYMENTS_ENABLED = os.environ.get("YOOKASSA_PAYMENTS_ENABLED", "0") == "1"
YOOKASSA_RECEIPTS_ENABLED = os.environ.get("YOOKASSA_RECEIPTS_ENABLED", "0") == "1"
YOOKASSA_VAT_CODE = int(os.environ.get("YOOKASSA_VAT_CODE", "1"))
YOOKASSA_PAYMENT_MODE = os.environ.get("YOOKASSA_PAYMENT_MODE", "full_prepayment").strip()
PAYMENTS_READY = bool(
    YOOKASSA_SHOP_ID
    and YOOKASSA_SECRET_KEY
    and YOOKASSA_PAYMENTS_ENABLED
    and YOOKASSA_RECEIPTS_ENABLED
    and DB_PATH
)

PRODUCTS = {
    "dyson-v7": ("Аккумулятор для Dyson V7 / SV11", 3190),
    "dyson-v6": ("Аккумулятор для Dyson V6", 3090),
    "dyson-v11": ("Аккумулятор для Dyson V11", 4990),
    "dreame-5200": ("Аккумулятор для Dreame D9 / F9, 5200 мАч", 2590),
    "samsung-jet90": ("Аккумулятор VCA-SBT90 для Samsung Jet 75 / 90", 4790),
    "exvac-3200": ("Аккумулятор INR18650 M26-4S1P, 3200 мАч", 2090),
    "mop2-lite": ("Аккумулятор для Xiaomi Vacuum-Mop 2 Lite", 2090),
    "mop2-3200": ("Аккумулятор для Xiaomi Vacuum-Mop 2", 1990),
    "xiaomi-g1": ("Аккумулятор для Xiaomi Vacuum-Mop Essential G1", 2090),
    "samsung-jet60": ("Аккумулятор для Samsung Jet 60", 4490),
    "lg-a9": ("Аккумулятор для LG CordZero A9", 3390),
    "samsung-jet70": ("Аккумулятор VCA-SBT90E для Samsung Jet 70 / 90E", 4490),
    "dreame-6400": ("Аккумулятор для Dreame D9 / F9, 6400 мАч", 2890),
    "xiaomi-1c-5200": ("Аккумулятор для Xiaomi Vacuum-Mop 1C, 5200 мАч", 2790),
    "roborock-6400": ("Аккумулятор для Roborock S5 / S6 / S7, 6400 мАч", 2990),
    "xiaomi-mopp-3200": ("Аккумулятор для Xiaomi Vacuum-Mop P / 2S / S10 / S12", 2290),
    "xiaomi-1c-6400": ("Аккумулятор для Xiaomi Vacuum-Mop 1C, 6400 мАч", 2990),
}

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



def cdek_post(path, payload):
    request = Request(
        CDEK_API + path,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": "Bearer " + get_token(),
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "HELIONYX/1.0",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.load(response)
    except HTTPError as error:
        raise ApiError("СДЭК не смог рассчитать доставку") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ApiError("Не удалось получить расчёт доставки СДЭК") from error


def delivery_quote(city_code, delivery_method, quantity):
    try:
        city_code = int(city_code)
        quantity = int(quantity)
    except (TypeError, ValueError) as error:
        raise ApiError("Некорректные данные для расчёта доставки", 400) from error
    if city_code <= 0 or quantity < 1 or quantity > 10:
        raise ApiError("Некорректные данные для расчёта доставки", 400)
    if delivery_method not in ("cdek-pvz", "cdek-courier"):
        raise ApiError("Выберите способ доставки СДЭК", 400)

    sender = resolve_city("Воронеж")
    tariff_code = 138 if delivery_method == "cdek-pvz" else 136
    result = cdek_post("/v2/calculator/tariff", {
        "type": 1,
        "tariff_code": tariff_code,
        "from_location": {"code": sender["code"]},
        "to_location": {"code": city_code},
        "packages": [{
            "weight": 600 * quantity,
            "length": 25,
            "width": 18,
            "height": min(60, 12 * quantity),
        }],
    })
    raw_sum = result.get("total_sum") or result.get("delivery_sum")
    if raw_sum is None:
        raise ApiError("СДЭК не вернул стоимость доставки")
    amount = int(math.ceil(float(raw_sum)))
    if amount <= 0 or amount > 50000:
        raise ApiError("Получена некорректная стоимость доставки")
    return {
        "amount": amount,
        "tariff_code": tariff_code,
        "period_min": result.get("period_min"),
        "period_max": result.get("period_max"),
    }


def normalize_phone(value):
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) == 10:
        digits = "7" + digits
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) < 11 or len(digits) > 15:
        raise ApiError("Проверьте номер телефона", 400)
    return digits


def validate_email(value):
    email = str(value or "").strip().lower()
    if len(email) > 120 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ApiError("Проверьте email для чека", 400)
    return email


def validate_text(value, name, minimum, maximum):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) < minimum or len(text) > maximum:
        raise ApiError("Проверьте поле «%s»" % name, 400)
    return text


def validate_order(payload):
    raw_items = payload.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise ApiError("Корзина пуста", 400)

    items = []
    total_quantity = 0
    goods_total = 0
    seen = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            raise ApiError("Некорректный состав заказа", 400)
        slug = str(raw.get("slug") or "")
        if slug in seen or slug not in PRODUCTS:
            raise ApiError("В корзине найден неизвестный товар", 400)
        seen.add(slug)
        try:
            quantity = int(raw.get("quantity"))
        except (TypeError, ValueError) as error:
            raise ApiError("Некорректное количество товара", 400) from error
        if quantity < 1 or quantity > 5:
            raise ApiError("Можно заказать от 1 до 5 единиц одной модели", 400)
        title, price = PRODUCTS[slug]
        items.append({"slug": slug, "title": title, "price": price, "quantity": quantity})
        total_quantity += quantity
        goods_total += price * quantity

    if total_quantity > 10 or goods_total > 200000:
        raise ApiError("Для крупного заказа свяжитесь с нами", 400)

    delivery_method = str(payload.get("deliveryMethod") or "")
    city_code = str(payload.get("cdekCityCode") or "").strip()
    city_name = validate_text(payload.get("deliveryCity"), "город", 2, 120)
    delivery = {
        "method": delivery_method,
        "city_code": city_code,
        "city": city_name,
    }
    if delivery_method == "cdek-pvz":
        delivery["pvz"] = validate_text(payload.get("cdekPvz"), "ПВЗ", 3, 180)
        delivery["address"] = ""
    elif delivery_method == "cdek-courier":
        delivery["address"] = validate_text(payload.get("deliveryAddress"), "адрес", 5, 240)
        delivery["pvz"] = ""
    else:
        raise ApiError("Выберите способ доставки", 400)

    customer = {
        "name": validate_text(payload.get("customerName"), "ФИО", 5, 120),
        "phone": normalize_phone(payload.get("phone")),
        "email": validate_email(payload.get("email")),
        "vacuum_model": re.sub(r"\s+", " ", str(payload.get("vacuumModel") or "")).strip()[:120],
    }
    quote = delivery_quote(city_code, delivery_method, total_quantity)
    return {
        "items": items,
        "total_quantity": total_quantity,
        "goods_total": goods_total,
        "delivery": delivery,
        "delivery_quote": quote,
        "total": goods_total + quote["amount"],
        "customer": customer,
    }


def db_connect():
    if not DB_PATH:
        raise ApiError("Хранилище заказов не настроено", 503)
    directory = os.path.dirname(DB_PATH)
    if directory:
        os.makedirs(directory, mode=0o750, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            status TEXT NOT NULL,
            payment_id TEXT,
            amount INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            details_json TEXT NOT NULL
        )
    """)
    connection.commit()
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass
    return connection


def new_order_id():
    return "HNX-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:12].upper()


def insert_order(order_id, order):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as connection:
        connection.execute(
            """INSERT INTO orders
               (id, created_at, updated_at, status, amount, customer_name, phone, email, details_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                order_id,
                now,
                now,
                "creating_payment",
                order["total"],
                order["customer"]["name"],
                order["customer"]["phone"],
                order["customer"]["email"],
                json.dumps(order, ensure_ascii=False, separators=(",", ":")),
            ),
        )
        connection.commit()


def update_order(order_id, status, payment_id=None):
    now = datetime.now(timezone.utc).isoformat()
    with db_connect() as connection:
        connection.execute(
            """UPDATE orders
               SET status = ?, payment_id = COALESCE(?, payment_id), updated_at = ?
               WHERE id = ?""",
            (status, payment_id, now, order_id),
        )
        connection.commit()


def get_order(order_id):
    with db_connect() as connection:
        return connection.execute(
            "SELECT id, status, payment_id, amount, created_at FROM orders WHERE id = ?",
            (order_id,),
        ).fetchone()


def get_order_by_payment_id(payment_id):
    with db_connect() as connection:
        return connection.execute(
            "SELECT id, status, payment_id, amount, created_at FROM orders WHERE payment_id = ?",
            (payment_id,),
        ).fetchone()


def yookassa_request(method, path, payload=None, idempotence_key=None):
    credentials = base64.b64encode(
        ("%s:%s" % (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)).encode("utf-8")
    ).decode("ascii")
    headers = {
        "Authorization": "Basic " + credentials,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "HELIONYX/1.0",
    }
    if idempotence_key:
        headers["Idempotence-Key"] = idempotence_key
    request = Request(
        YOOKASSA_API + path,
        data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method=method,
        headers=headers,
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.load(response)
    except HTTPError as error:
        try:
            details = json.load(error)
            description = details.get("description") or details.get("code")
        except Exception:
            description = None
        raise ApiError(
            "ЮKassa отклонила запрос%s" % (": " + description if description else ""),
            502,
        ) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ApiError("Не удалось связаться с ЮKassa") from error


def receipt_items(order):
    items = []
    for item in order["items"]:
        items.append({
            "description": item["title"][:128],
            "quantity": float(item["quantity"]),
            "amount": {"value": "%.2f" % item["price"], "currency": "RUB"},
            "vat_code": YOOKASSA_VAT_CODE,
            "payment_mode": YOOKASSA_PAYMENT_MODE,
            "payment_subject": "commodity",
            "measure": "piece",
        })
    items.append({
        "description": "Доставка СДЭК",
        "quantity": 1.0,
        "amount": {"value": "%.2f" % order["delivery_quote"]["amount"], "currency": "RUB"},
        "vat_code": YOOKASSA_VAT_CODE,
        "payment_mode": YOOKASSA_PAYMENT_MODE,
        "payment_subject": "service",
    })
    return items


def create_yookassa_payment(order_id, order):
    payload = {
        "amount": {"value": "%.2f" % order["total"], "currency": "RUB"},
        "capture": True,
        "payment_method_data": {"type": "sbp"},
        "confirmation": {
            "type": "redirect",
            "return_url": PUBLIC_URL + "/payment-result/?order=" + order_id,
        },
        "description": "Заказ HELIONYX " + order_id,
        "metadata": {"order_id": order_id},
        "receipt": {
            "customer": {
                "full_name": order["customer"]["name"],
                "email": order["customer"]["email"],
                "phone": order["customer"]["phone"],
            },
            "items": receipt_items(order),
        },
    }
    payment = yookassa_request(
        "POST",
        "/payments",
        payload,
        idempotence_key=uuid.uuid4().hex,
    )
    confirmation_url = (payment.get("confirmation") or {}).get("confirmation_url")
    payment_id = payment.get("id")
    if not payment_id or not confirmation_url:
        raise ApiError("ЮKassa не вернула ссылку на оплату")
    return payment_id, confirmation_url


def verify_payment(payment_id):
    payment = yookassa_request("GET", "/payments/" + payment_id)
    order_id = str((payment.get("metadata") or {}).get("order_id") or "")
    if not order_id:
        raise ApiError("В платеже отсутствует номер заказа")
    order = get_order(order_id)
    if not order or order["payment_id"] != payment_id:
        raise ApiError("Платёж не связан с заказом", 400)
    expected = "%.2f" % order["amount"]
    actual = str((payment.get("amount") or {}).get("value") or "")
    if actual != expected:
        raise ApiError("Сумма платежа не совпадает с заказом", 400)
    status = str(payment.get("status") or "")
    if status == "succeeded" and payment.get("paid") is True:
        update_order(order_id, "paid", payment_id)
    elif status == "canceled":
        update_order(order_id, "canceled", payment_id)
    else:
        update_order(order_id, "pending", payment_id)
    return order_id, status


def verify_refund(refund_id):
    refund = yookassa_request("GET", "/refunds/" + refund_id)
    payment_id = str(refund.get("payment_id") or "")
    if not payment_id:
        raise ApiError("В возврате отсутствует идентификатор платежа")

    order = get_order_by_payment_id(payment_id)
    if not order:
        raise ApiError("Возврат не связан с заказом", 400)

    status = str(refund.get("status") or "")
    amount_value = str((refund.get("amount") or {}).get("value") or "")
    try:
        refund_amount = int(round(float(amount_value)))
    except (TypeError, ValueError) as error:
        raise ApiError("В возврате отсутствует корректная сумма", 400) from error
    if refund_amount <= 0 or refund_amount > order["amount"]:
        raise ApiError("Сумма возврата не совпадает с заказом", 400)

    if status == "succeeded":
        order_status = "refunded" if refund_amount == order["amount"] else "partially_refunded"
        update_order(order["id"], order_status, payment_id)
    return order["id"], status


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
                "yookassa_configured": bool(YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY),
                "payments_enabled": PAYMENTS_READY,
            })
            return

        if parsed.path == "/api/payment/config":
            self.send_json(200, {
                "available": PAYMENTS_READY,
                "method": "sbp",
                "receipts_enabled": YOOKASSA_RECEIPTS_ENABLED,
                "message": (
                    "Оплата через СБП доступна."
                    if PAYMENTS_READY
                    else "СБП подключено. Запуск оплаты ожидает подключения онлайн-кассы."
                ),
            })
            return

        order_match = re.fullmatch(r"/api/orders/(HNX-[A-Z0-9-]+)/status", parsed.path)
        if order_match:
            try:
                order = get_order(order_match.group(1))
                if not order:
                    self.send_json(404, {"error": "Заказ не найден"})
                    return
                if order["payment_id"] and order["status"] in ("creating_payment", "pending"):
                    verify_payment(order["payment_id"])
                    order = get_order(order["id"])
                self.send_json(200, {
                    "order_id": order["id"],
                    "status": order["status"],
                    "amount": order["amount"],
                    "created_at": order["created_at"],
                })
            except ApiError as error:
                self.send_json(error.status, {"error": str(error)})
            except Exception:
                self.send_json(500, {"error": "Не удалось проверить заказ"})
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

    def read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ApiError("Некорректный запрос", 400) from error
        if length < 2 or length > 65536:
            raise ApiError("Некорректный размер запроса", 400)
        try:
            payload = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ApiError("Некорректный JSON", 400) from error
        if not isinstance(payload, dict):
            raise ApiError("Некорректный запрос", 400)
        return payload

    def do_POST(self):
        client_ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if rate_limited(client_ip):
            self.send_json(429, {"error": "Слишком много запросов. Попробуйте через минуту."})
            return

        try:
            if self.path == "/api/cdek/quote":
                payload = self.read_json_body()
                quote = delivery_quote(
                    payload.get("cdekCityCode"),
                    payload.get("deliveryMethod"),
                    payload.get("quantity"),
                )
                self.send_json(200, quote)
                return

            if self.path == "/api/orders":
                if not PAYMENTS_READY:
                    raise ApiError(
                        "СБП подключено, но оплата откроется после подключения онлайн-кассы.",
                        503,
                    )
                payload = self.read_json_body()
                order = validate_order(payload)
                order_id = new_order_id()
                insert_order(order_id, order)
                try:
                    payment_id, confirmation_url = create_yookassa_payment(order_id, order)
                    update_order(order_id, "pending", payment_id)
                except Exception:
                    update_order(order_id, "payment_error")
                    raise
                self.send_json(201, {
                    "order_id": order_id,
                    "confirmation_url": confirmation_url,
                })
                return

            if self.path == "/api/yookassa/webhook":
                payload = self.read_json_body()
                event = str(payload.get("event") or "")
                object_id = str((payload.get("object") or {}).get("id") or "")
                if not object_id:
                    self.send_json(200, {"ok": True})
                    return
                if event in ("payment.succeeded", "payment.canceled"):
                    order_id, status = verify_payment(object_id)
                    self.send_json(200, {"ok": True, "order_id": order_id, "status": status})
                    return
                if event == "refund.succeeded":
                    order_id, status = verify_refund(object_id)
                    self.send_json(200, {"ok": True, "order_id": order_id, "status": status})
                    return
                self.send_json(200, {"ok": True})
                return

            self.send_json(404, {"error": "Not found"})
        except ApiError as error:
            self.send_json(error.status, {"error": str(error)})
        except Exception as error:
            print("POST error: %r" % error, flush=True)
            self.send_json(500, {"error": "Внутренняя ошибка сервера."})

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("HELIONYX API listening on %s:%s" % (HOST, PORT), flush=True)
    server.serve_forever()
