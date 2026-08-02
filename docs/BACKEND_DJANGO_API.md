# Backend Spec — Django REST Framework + PostgreSQL

Target backend for the Grocery & Pooja Products app (customer app + admin panel).
Everything below matches the data the current frontend already consumes.

- Base URL: `https://api.example.com/api/v1`
- Auth: JWT (SimpleJWT) — `Authorization: Bearer <access>`
- Content type: `application/json`
- Currency: INR, amounts as `decimal(10,2)` strings
- Timestamps: ISO-8601 UTC

---

## 1. Stack

```
Django 5.x
djangorestframework
djangorestframework-simplejwt
django-cors-headers
django-filter
psycopg[binary]           # PostgreSQL
celery + redis            # async OTP email/SMS, order notifications
drf-spectacular           # OpenAPI schema at /api/schema/swagger-ui/
Pillow                    # product images
```

```bash
pip install django djangorestframework djangorestframework-simplejwt \
  django-cors-headers django-filter psycopg[binary] celery redis \
  drf-spectacular pillow python-dotenv
```

### Apps
```
accounts/     User, Profile, Address, OTP, roles
catalog/      Category, Product, ProductImage, Banner
orders/       Cart, CartItem, Order, OrderItem, Wishlist
locations/    StoreLocation
notifications/Notification
```

### .env
```
DJANGO_SECRET_KEY=
DEBUG=False
DATABASE_URL=postgres://user:pass@localhost:5432/mnx
ALLOWED_HOSTS=api.example.com
CORS_ALLOWED_ORIGINS=https://yourapp.com,http://localhost:8080
EMAIL_HOST=smtp.sendgrid.net
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=no-reply@yourdomain.com
SMS_PROVIDER_KEY=            # MSG91 / Twilio / Fast2SMS
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN=30
```

---

## 2. Data models

### accounts.User (custom, `AUTH_USER_MODEL`)
| field | type | notes |
|---|---|---|
| id | UUID pk | |
| phone | char(15) unique null | E.164, primary login for customers |
| email | email unique null | |
| full_name | char(120) | |
| is_phone_verified | bool | |
| is_email_verified | bool | |
| role | char choices `admin` \| `customer` | default `customer` |
| is_active / is_staff / is_superuser | bool | |
| date_joined, last_login | datetime | |

`USERNAME_FIELD = "phone"`, manager `create_user(phone, ...)`, `create_superuser`.
Keep `role` here **only** for convenience; permission checks use `IsAdminRole` below.

### accounts.Profile — `OneToOne(User)`
`avatar_url`, `alt_phone`, `dob`, `created_at`, `updated_at`.

### accounts.Address
`user FK`, `label` (Home/Work/Other), `recipient_name`, `phone`, `line1`, `line2`,
`landmark`, `city`, `state`, `pincode`, `latitude` float, `longitude` float,
`is_default` bool, timestamps.

### accounts.OtpCode
`identifier` (phone or email), `channel` (`sms`|`email`), `purpose`
(`login`|`signup`|`reset`|`verify`), `code_hash` (sha256, never store plaintext),
`expires_at`, `attempts` int, `consumed_at` null, `created_at`.
Index on `(identifier, purpose, created_at)`.

### catalog.Category
`name`, `slug` unique, `description`, `image_url`, `sort_order`, `is_active`, `created_at`.

### catalog.Product
`category FK null`, `name`, `slug` unique, `description`, `weight`, `price` decimal,
`mrp` decimal null, `stock` int, `image_url`, `video_url` null,
`is_active`, `is_featured`, `is_best_seller`, `is_recommended`, timestamps.

### catalog.ProductImage
`product FK`, `image_url`, `sort_order`.

### catalog.Banner
`title`, `subtitle`, `image_url`, `link_slug`, `sort_order`, `is_active`, `created_at`.

### orders.CartItem
`user FK`, `product FK`, `quantity` int, timestamps. Unique `(user, product)`.

### orders.WishlistItem
`user FK`, `product FK`, `created_at`. Unique `(user, product)`.

### orders.Order
`user FK`, `order_number` char unique (`MNX-1001`, from a Postgres sequence),
`status` choices `pending|confirmed|packed|delivered|cancelled` default `pending`,
`subtotal`, `delivery_fee`, `total`, `recipient_name`, `phone`, `address_text`,
`notes`, `store FK null`, timestamps.

### orders.OrderItem
`order FK`, `product FK null (SET_NULL)`, `product_name`, `product_weight`,
`image_url`, `unit_price`, `quantity`, `line_total` (snapshot at purchase time).

### locations.StoreLocation
`name`, `address_text`, `city`, `state`, `pincode`, `latitude`, `longitude`,
`phone`, `opening_hours`, `delivery_radius_km` decimal, `is_active`, timestamps.

### notifications.Notification
`user FK`, `title`, `body`, `type` (`order`|`admin_order`|`promo`|`system`),
`order FK null`, `is_read` bool, `created_at`.

---

## 3. Permissions

```python
class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.role == "admin" or u.is_staff))

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id
```

| Resource | anonymous | customer | admin |
|---|---|---|---|
| categories, banners, products, stores | read (active only) | read | full CRUD |
| cart, wishlist, addresses, notifications | – | own rows only | – |
| orders | – | create + read own, cancel while `pending` | read/update all, create for any user |
| users/customers | – | own profile | list, view spend |

Throttling: `anon 60/min`, `user 300/min`, `otp 5/min per identifier + 20/hour per IP`.

---

## 4. Authentication & OTP

### 4.1 Flows

**Phone OTP login/signup (primary)**
```
POST /auth/otp/request  { "phone": "+919876543210", "purpose": "login" }
   -> 200 { "sent": true, "channel": "sms", "expires_in": 300, "resend_in": 30 }
POST /auth/otp/verify   { "phone": "+919876543210", "code": "482913", "purpose": "login" }
   -> 200 { "access": "...", "refresh": "...", "is_new_user": false, "user": {...} }
```
If `is_new_user` is true the account is created on verify with `is_phone_verified=true`;
the app then calls `PATCH /me` to set `full_name`.

**Email OTP** — identical, send `email` instead of `phone`:
```
POST /auth/otp/request  { "email": "user@example.com", "purpose": "login" }
POST /auth/otp/verify   { "email": "user@example.com", "code": "482913", "purpose": "login" }
```

**Password login (admin panel)**
```
POST /auth/login    { "identifier": "admin@mnxstore.in", "password": "..." }
   -> { "access", "refresh", "user": { "role": "admin", ... } }
POST /auth/refresh  { "refresh": "..." } -> { "access" }
POST /auth/logout   { "refresh": "..." } -> 205 (blacklists token)
```

**Password reset** — `purpose: "reset"` OTP, then
`POST /auth/password/reset { email, code, new_password }`.

### 4.2 OTP rules (implement exactly)
1. 6 numeric digits, generated with `secrets.randbelow(10**6)` zero-padded.
2. Store **sha256(code + SECRET_KEY)**, never the raw code.
3. TTL 5 minutes; single use — set `consumed_at` on success.
4. Max 5 verify attempts per code, then invalidate and force a new request.
5. Resend cooldown 30s; max 5 requests / identifier / 10 min.
6. Invalidate all previous unconsumed codes for the same `(identifier, purpose)` on a new request.
7. Same generic error for wrong code and unknown identifier (no user enumeration).
8. Send via Celery task; in `DEBUG` log the code to console instead of sending.
9. Fixed OTP `123456` allowed **only** for the demo accounts in section 7 when
   `ENABLE_DEMO_OTP=True` — never enable in production.

```python
# accounts/services/otp.py
def issue_otp(identifier, channel, purpose):
    OtpCode.objects.filter(identifier=identifier, purpose=purpose,
                           consumed_at__isnull=True).delete()
    code = f"{secrets.randbelow(10**6):06d}"
    OtpCode.objects.create(
        identifier=identifier, channel=channel, purpose=purpose,
        code_hash=hash_code(code),
        expires_at=timezone.now() + timedelta(seconds=settings.OTP_TTL_SECONDS),
    )
    send_otp_task.delay(identifier, channel, code)
```

---

## 5. Endpoints

### Public catalog
```
GET  /home                       -> { banners, categories, featured, best_sellers, recommended }
GET  /categories
GET  /categories/{slug}/products?sort=price_asc&page=1
GET  /products?search=&category=&min_price=&max_price=&sort=&page=
GET  /products/{slug}            -> product + images[] + video_url + related[]
GET  /banners
GET  /stores?lat=&lng=           -> stores with distance_km, sorted
```

### Me / account
```
GET    /me                       PATCH /me            { full_name, email, avatar_url }
GET    /me/addresses             POST /me/addresses
PATCH  /me/addresses/{id}        DELETE /me/addresses/{id}
POST   /me/addresses/{id}/default
```

### Cart & wishlist
```
GET    /cart                     -> { items[], subtotal, delivery_fee, total, savings }
POST   /cart          { product_id, quantity }     # upsert
PATCH  /cart/{id}     { quantity }                 # 0 removes
DELETE /cart/{id}     DELETE /cart                 # clear
GET    /wishlist      POST /wishlist { product_id }  DELETE /wishlist/{product_id}
```

### Orders (customer)
```
POST /orders   { address_id, notes, payment_method: "cod" }
   -> creates order from cart atomically, decrements stock, clears cart,
      notifies all admins + the customer
GET  /orders            GET /orders/{id}
POST /orders/{id}/cancel      # only while status == pending
POST /orders/{id}/reorder     # refills cart
```

### Notifications
```
GET   /notifications?unread=true
POST  /notifications/{id}/read      POST /notifications/read-all
DELETE /notifications/{id}
```
Live updates: poll every 30s, or connect Django Channels at `wss://.../ws/notifications/?token=<access>`.

### Admin (`/admin-api/...`, `IsAdminRole`)
```
GET   /admin-api/dashboard        -> { revenue_today, orders_today, pending_count,
                                       low_stock[], revenue_series[], top_products[] }
GET   /admin-api/orders?status=&q=&page=
PATCH /admin-api/orders/{id}      { status }     # approve = confirmed, reject = cancelled
POST  /admin-api/orders           { user_id|phone, items[], address_text, ... }  # manual/phone order
CRUD  /admin-api/products         (incl. video_url, stock, flags)
CRUD  /admin-api/categories  /admin-api/banners  /admin-api/stores
GET   /admin-api/customers        -> users with order_count, total_spend, last_order_at
POST  /admin-api/users/{id}/role  { role: "admin" | "customer" }
```

### Conventions
- Errors: `{ "detail": "...", "code": "otp_invalid", "fields": { "phone": ["..."] } }`
- Pagination: `?page=&page_size=` -> `{ count, next, previous, results }`
- Status codes: 200/201/204, 400 validation, 401 unauth, 403 role, 404, 409 stock conflict, 429 throttled.

---

## 6. Order status machine

```
pending ──approve──> confirmed ──> packed ──> delivered
   │                     │            │
   └──cancel/reject──> cancelled <────┘   (admin only after confirmed)
```
- Customer may cancel only while `pending`.
- Every transition writes a `Notification` for the customer.
- Order creation writes an `admin_order` notification for every admin user.
- Stock is decremented on create, restored on `cancelled`.

---

## 7. Demo / dummy accounts (seed fixture)

Create with `python manage.py seed_demo`. **Password for every demo account:
`Demo@12345`. Demo OTP: `123456`** (only when `ENABLE_DEMO_OTP=True`).

### Admins
| Role | Email | Phone | Password |
|---|---|---|---|
| Super admin | `admin@mnxstore.in` | `+919000000001` | `Demo@12345` |
| Store manager | `manager@mnxstore.in` | `+919000000002` | `Demo@12345` |
| Order desk | `orders@mnxstore.in` | `+919000000003` | `Demo@12345` |

### Customers
| Name | Email | Phone | Password | Seeded state |
|---|---|---|---|---|
| Ananya Iyer | `ananya@example.com` | `+919111100001` | `Demo@12345` | 2 addresses, 3 cart items, 4 orders (1 pending, 1 packed, 2 delivered) |
| Ravi Kumar | `ravi@example.com` | `+919111100002` | `Demo@12345` | 1 address, wishlist of 5, 1 cancelled order |
| Meera Nair | `meera@example.com` | `+919111100003` | `Demo@12345` | new user, empty cart — good for onboarding demos |

```python
# accounts/management/commands/seed_demo.py
DEMO_PASSWORD = "Demo@12345"
ADMINS = [
    ("admin@mnxstore.in",   "+919000000001", "Super Admin"),
    ("manager@mnxstore.in", "+919000000002", "Store Manager"),
    ("orders@mnxstore.in",  "+919000000003", "Order Desk"),
]
CUSTOMERS = [
    ("ananya@example.com", "+919111100001", "Ananya Iyer"),
    ("ravi@example.com",   "+919111100002", "Ravi Kumar"),
    ("meera@example.com",  "+919111100003", "Meera Nair"),
]

class Command(BaseCommand):
    def handle(self, *a, **kw):
        for email, phone, name in ADMINS:
            u, _ = User.objects.get_or_create(
                email=email, defaults={"phone": phone, "full_name": name,
                                       "role": "admin", "is_staff": True,
                                       "is_phone_verified": True, "is_email_verified": True})
            u.set_password(DEMO_PASSWORD); u.save()
        for email, phone, name in CUSTOMERS:
            u, _ = User.objects.get_or_create(
                email=email, defaults={"phone": phone, "full_name": name,
                                       "role": "customer", "is_phone_verified": True})
            u.set_password(DEMO_PASSWORD); u.save()
```

Guard demo data so it can never reach production:
```python
if not settings.DEBUG and not settings.ALLOW_DEMO_SEED:
    raise CommandError("Refusing to seed demo accounts in production")
```

---

## 8. User activity logs

Two levels — keep both.

### 8.1 `accounts.UserActivityLog` (app-level, shown in admin panel)
| field | type |
|---|---|
| id | UUID |
| user | FK null (null for anonymous / failed login) |
| action | char — see list below |
| object_type / object_id | char / UUID null |
| metadata | JSONB |
| ip_address | inet |
| user_agent | text |
| created_at | datetime (index) |

Actions to record:
```
auth.otp_requested   auth.otp_failed      auth.login       auth.login_failed
auth.logout          auth.signup          profile.updated  address.created
address.updated      address.deleted      cart.added       cart.updated
cart.removed         wishlist.toggled     order.placed     order.cancelled
order.status_changed product.created      product.updated  product.deleted
category.changed     banner.changed       store.changed    role.changed
```

Write them from a small helper + DRF middleware:
```python
def log_activity(request, action, obj=None, **meta):
    UserActivityLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        object_type=obj.__class__.__name__ if obj else "",
        object_id=getattr(obj, "id", None),
        metadata=meta,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
    )
```
Never log OTP codes, passwords, or tokens — store only `{"identifier_masked": "+9198*****10"}`.

Admin endpoints:
```
GET /admin-api/activity-logs?user=&action=&from=&to=&page=
GET /admin-api/customers/{id}/activity
```

### 8.2 Server logs
`LOGGING` with a JSON formatter to stdout, request id middleware, Sentry for
exceptions. Retain app activity logs 180 days (`clean_activity_logs` Celery beat job).

---

## 9. Frontend integration notes

- Store `access` in memory + `refresh` in an httpOnly cookie (or secure storage on mobile);
  refresh on 401 and retry once.
- The current app's screens map 1:1 to the endpoints above — swapping the data
  layer means replacing the server functions in `src/lib/*.functions.ts` with
  `fetch` calls to this API, keeping the same return shapes documented in `src/lib/types.ts`.
- CORS must allow the app origin, `Authorization` header, and `PATCH`/`DELETE`.

---

## 10. Storefront discovery, coupons & brands (update — Jul 2026)

The home screen now exposes a **See all** action on every rail. Each one maps to a
dedicated page and endpoint.

| Home section | Page | Endpoint |
| --- | --- | --- |
| Flash sale | `/deals` | `GET /catalog/deals` |
| Deal of the day | `/deals` | `GET /catalog/deals?tab=flash` |
| Today's deals / Trending | `/deals` | `GET /catalog/deals?tab=today` |
| Under ₹99 store | `/deals` | `GET /catalog/deals?tab=budget&max_price=99` |
| Offers & festive picks | `/offers` | `GET /catalog/offers` |
| Coupons for you | `/coupons` | `GET /coupons` |
| Featured brands | `/brands` | `GET /catalog/brands/directory` |
| Shop by need / Newly added | `/categories` | `GET /catalog/categories` |

### 10.1 New public endpoints

```
GET /catalog/deals?tab=all|flash|today|budget&max_price=&page=
→ { results: [Product], counts: { discounted, budget }, deal_of_the_day: Product }
   Product ordering: discount_percent DESC, where
   discount_percent = round((mrp - price) / mrp * 100)

GET /catalog/offers
→ { banners: [Banner], categories: [Category], products: [Product] }
   Banners filtered on is_active, ordered by sort_order.

GET /coupons
→ [{ id, code, title, description, discount_type, discount_value,
     min_order, max_discount, starts_at, ends_at, is_active }]
   Only is_active=true and (ends_at is null or ends_at >= now()).
   Badge text is derived client-side:
     percent → "{value}% OFF", flat → "₹{value} OFF", free_shipping → "FREE SHIP".

GET /catalog/brands/directory
→ { banners: [Banner],
    brands: [{ id, name, slug, tagline, logo_url, banner_url, products: [Product] }] }
   banner_url: the brand's own hero image; fall back to the rotating active
   banners when a brand has none. products: up to 10 active products per brand.
```

### 10.2 Brand model additions (`catalog.Brand`)

| Field | Type | Notes |
| --- | --- | --- |
| `banner_url` | URLField, nullable | Wide hero image shown on `/brands` |
| `tagline` | CharField(120), nullable | Shown under the brand name |
| `sort_order` | Integer, default 0 | Rail + directory ordering |
| `is_active` | Boolean, default true | Hidden brands are excluded everywhere |

### 10.3 Admin customer detail

The admin panel list at `/admin/customers` links each row to `/admin/customer/{id}`.

```
GET /admin-api/customers/{id}
→ {
    profile: { id, full_name, phone, avatar_url, created_at },
    stats:   { orders, cancelled, spend, avg, last_order_at },
    orders:  [{ id, order_number, status, total, subtotal, discount, delivery_fee,
                payment_method, recipient_name, phone, address_text,
                delivery_slot, created_at }],
    items:   [{ order_id, product_name, variant_label, quantity, line_total }],
    reviews: [{ id, product_id, rating, title, body, created_at }]
  }
```

Rules:
- Permission `IsAdminRole`; never exposed to customers.
- `spend` sums non-cancelled orders only; `avg = spend / count(non-cancelled)`.
- `items` is a single batched query over the customer's order ids (no N+1).
- The most recent order's `address_text` is displayed as the customer's last
  known delivery address (the `Address` book itself stays private to the owner).

### 10.4 Changelog discipline

This document is updated in the same change as any frontend/data-layer work.
Latest entries:
- Jul 2026 — See-all pages (`/deals`, `/offers`, `/coupons`, `/brands`), live
  coupon + brand data on the home screen, admin customer detail view.
- Earlier — product variants (pack sizes), multi-image galleries, filters,
  reviews, returns, notifications, store locations.

---

## 11. Media uploads, responsive shell & OTP auth (update — Aug 2026)

### 11.1 Media library

The frontend now uploads all imagery (banners, brand logos/banners, coupon
banners, category images, product galleries and pack/variant images) instead of
pasting URLs. On Lovable Cloud this uses a **private** `media` storage bucket and
stores a long-lived signed URL on the row. A Django backend should mirror this
with a single upload endpoint plus object storage (S3 / MinIO):

```
POST /api/v1/media/                      (admin only, multipart)
  form-data: file=<binary>, folder=banners|brands|coupons|categories|products|variants
  201 -> { "id": uuid, "url": "https://cdn…/banners/oils-1723.jpg",
           "path": "banners/oils-1723.jpg", "content_type": "image/jpeg", "size": 148213 }

DELETE /api/v1/media/<id>/               (admin only)
```

Rules enforced on both client and server:

- Allowed types: `image/png`, `image/jpeg`, `image/webp`, `image/avif`, `image/gif`, `image/svg+xml`
- Max size: 8 MB per file
- Filenames are slugified and suffixed with a timestamp + random token
- `Cache-Control: public, max-age=31536000, immutable`

Affected write payloads (all accept an absolute URL string):

| Model | Fields |
| --- | --- |
| `Banner` | `image_url` |
| `Brand` | `logo_url`, `banner_url` |
| `Coupon` | `banner_url` |
| `Category` | `image_url` |
| `Product` | `image_url`, `video_url`, `images[]` (ordered, first = main) |
| `ProductVariant` | `image_url` |

`Product.images[]` replaces the old newline-delimited text field: send an ordered
array of URLs; the backend rewrites `product_images` rows with `sort_order`
matching array index.

### 11.2 Banner carousel behaviour

`GET /api/v1/banners/?placement=home` may now return **any number** of active
banners (10+ is expected). Ordering is `sort_order, created_at`. The client
renders every banner in one paginating hero carousel with swipe, desktop arrows
and a scrollable dot strip; no server-side cap. Placements remain
`home | offers | coupons | brands`, with optional `brand_id` / `coupon_id`
attachment.

Auto-scrolling product rails have been removed app-wide; rails are manual-scroll
only, so no `auto_scroll` flag is needed on any response.

### 11.3 Phone OTP + Email OTP authentication

Three sign-in methods are exposed in the UI: **Mobile OTP**, **Email OTP** and
**Password** (plus Google OAuth). Register and sign-in share the same endpoints;
the `mode` only controls whether a missing account is created.

```
POST /api/v1/auth/otp/request/
  { "channel": "phone" | "email", "identifier": "+919876543210", "full_name": "optional" }
  200 -> { "ok": true, "expires_at": iso8601, "cooldown_seconds": 30,
           "preview_code": "482913"   # non-production hosts only
         }
  429 -> { "ok": false, "detail": "Please wait 18s before requesting another code." }

POST /api/v1/auth/otp/verify/
  { "channel": "phone" | "email", "identifier": "+919876543210",
    "code": "482913", "full_name": "optional" }
  200 -> { "access": jwt, "refresh": jwt, "is_new": false, "user": {...} }
  400 -> { "ok": false, "detail": "That code is incorrect.", "attempts_remaining": 3 }
```

Server-side policy (matches the implementation):

- Code: 6 random digits, stored only as SHA-256 hash
- TTL: 300 s · resend cooldown: 30 s · max verify attempts: 5
- Requesting a new code consumes all live codes for that identifier + purpose
- Phone numbers are normalised to `+91XXXXXXXXXX` (last 10 digits)
- Phone-only accounts get a deterministic internal email `p<10digits>@phone.mnxstore.in`
  so a single user table serves both channels
- The plaintext code is returned as `preview_code` **only** on localhost/preview
  hosts; production requires a real SMS/email provider

Password reset uses:

```
POST /api/v1/auth/password/reset/          { "email": "…" }   -> emails a link to /reset-password
POST /api/v1/auth/password/reset/confirm/  { "token": "…", "password": "…" }
```

The frontend hosts the matching `/reset-password` page.

### 11.4 Responsive shell

No API impact, recorded for parity: the storefront now renders a desktop top
navigation (search, categories, deals, offers, brands, coupons, stores, cart,
account) above `lg`, keeps the bottom tab bar below `lg`, and widens product
grids to 3–5 columns. List endpoints should therefore support a `page_size` up
to 60 so desktop grids can fill without extra round-trips.
