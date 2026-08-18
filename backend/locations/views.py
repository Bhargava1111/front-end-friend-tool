import json
import math
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from rest_framework.response import Response
from rest_framework.views import APIView

from locations.models import StoreLocation

USER_AGENT = "SriMahalakshmiStores/1.0 (contact@srimahalakshmistores.in)"
PHOTON_REVERSE = "https://photon.komoot.io/reverse"
PHOTON_SEARCH = "https://photon.komoot.io/api/"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"


def _pick_address_field(address: dict, *keys: str) -> str:
    for key in keys:
        value = address.get(key)
        if value:
            return str(value)
    return ""


def _fetch_json(url: str, *, timeout: int = 8) -> dict | list | None:
    try:
        req = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    lat1r = math.radians(lat1)
    lat2r = math.radians(lat2)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlng / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def _normalize_area_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name.strip())
    lowered = cleaned.lower()
    replacements = {
        "k.r pura": "KR Puram",
        "k r pura": "KR Puram",
        "kr pura": "KR Puram",
        "bengaluru urban": "Bengaluru",
        "bangalore": "Bengaluru",
    }
    return replacements.get(lowered, cleaned)


def _unique_parts(*parts: str) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for part in parts:
        normalized = _normalize_area_name(part)
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def _photon_reverse(lat: float, lng: float) -> dict | None:
    params = urlencode({"lat": lat, "lon": lng})
    data = _fetch_json(f"{PHOTON_REVERSE}?{params}")
    if not isinstance(data, dict):
        return None
    features = data.get("features") or []
    if not features:
        return None
    return features[0].get("properties") or None


def _photon_nearby_cross(lat: float, lng: float, area_hint: str = "") -> tuple[str, float]:
    """Find the nearest named cross street within ~1 km."""
    queries = []
    if area_hint:
        queries.append(f"cross {area_hint}")
    queries.append("cross")

    best_name = ""
    best_km = 999.0
    for query in queries:
        params = urlencode({"q": query, "lat": lat, "lon": lng, "limit": 25})
        data = _fetch_json(f"{PHOTON_SEARCH}?{params}")
        if not isinstance(data, dict):
            continue
        for feature in data.get("features") or []:
            props = feature.get("properties") or {}
            name = str(props.get("name") or props.get("street") or "").strip()
            if not name or "cross" not in name.lower():
                continue
            coords = (feature.get("geometry") or {}).get("coordinates") or []
            if len(coords) < 2:
                continue
            km = _haversine_km(lat, lng, coords[1], coords[0])
            if km < best_km:
                best_km = km
                best_name = name
        if best_name and best_km < 0.5:
            break
    return best_name, best_km


def _nominatim_reverse(lat: float, lng: float) -> dict | None:
    params = urlencode({
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": 1,
        "zoom": 19,
    })
    return _fetch_json(f"{NOMINATIM_REVERSE}?{params}")


def _resolve_location(lat: float, lng: float) -> dict:
    photon = _photon_reverse(lat, lng) or {}

    street = ""
    if photon.get("name") and photon.get("osm_key") == "highway":
        street = str(photon["name"]).strip()
    elif photon.get("street"):
        street = str(photon["street"]).strip()
    elif photon.get("name") and photon.get("type") == "street":
        street = str(photon["name"]).strip()

    locality = _normalize_area_name(str(photon.get("locality") or ""))
    district = _normalize_area_name(str(photon.get("district") or ""))
    city = _normalize_area_name(
        str(photon.get("city") or photon.get("county") or photon.get("state_district") or "")
    )
    if city and any(token in city.lower() for token in (" east", " west", " north", " south", "corporation")):
        city = "Bengaluru"
    state = str(photon.get("state") or "").strip()
    postcode = str(photon.get("postcode") or "").strip()

    nominatim = _nominatim_reverse(lat, lng)
    address = (nominatim or {}).get("address") or {}

    if not street:
        house = _pick_address_field(address, "house_number")
        road = _pick_address_field(
            address,
            "road",
            "pedestrian",
            "footway",
            "residential",
            "path",
            "cycleway",
        )
        street = f"{house} {road}".strip() if house and road else road

    suburb = _normalize_area_name(
        _pick_address_field(address, "suburb", "neighbourhood", "quarter", "hamlet")
    )
    neighbourhood = _normalize_area_name(_pick_address_field(address, "neighbourhood", "quarter", "hamlet"))
    if not locality:
        locality = neighbourhood or suburb
    if not district:
        district = suburb
    if not city:
        city = _normalize_area_name(
            _pick_address_field(
                address,
                "city",
                "town",
                "village",
                "municipality",
                "state_district",
                "county",
            )
        )
    if city and ("east" in city.lower() or "west" in city.lower() or "corporation" in city.lower()):
        city = _normalize_area_name(
            _pick_address_field(address, "city", "city_district", "state_district")
        ) or "Bengaluru"
    if not state:
        state = _pick_address_field(address, "state")
    if not postcode:
        postcode = _pick_address_field(address, "postcode")

  # When reverse geocode only finds an area name, try the nearest cross street.
    if not street or street.casefold() in {district.casefold(), locality.casefold(), suburb.casefold()}:
        cross_hint = locality or district or suburb
        cross_name, cross_km = _photon_nearby_cross(lat, lng, cross_hint)
        if cross_name and cross_km <= 0.4:
            street = cross_name

    area_parts = _unique_parts(locality, district, suburb)
    area = ", ".join(area_parts)

    if street and district and district.casefold() not in street.casefold():
        label = f"{street}, {district}"
    elif street and area:
        label = f"{street}, {area}"
    elif street and city:
        label = f"{street}, {city}"
    elif area and city and area != city:
        label = f"{area}, {city}"
    elif street:
        label = street
    elif area:
        label = area
    elif city:
        label = city
    else:
        label = ((nominatim or {}).get("display_name") or "Current location").split(",")[0]

    line1 = street or area_parts[0] if area_parts else label
    line2_parts = [part for part in area_parts if part.casefold() != line1.casefold()]
    line2 = ", ".join(line2_parts)

    detail_parts = _unique_parts(street, *area_parts, city, state, postcode)

    return {
        "label": label,
        "detail": " · ".join(detail_parts),
        "street": street or None,
        "suburb": district or suburb or locality or None,
        "city": city or None,
        "state": state or None,
        "pincode": postcode or None,
        "line1": line1,
        "line2": line2 or None,
        "landmark": locality if locality and locality not in {line1, line2} else None,
        "latitude": lat,
        "longitude": lng,
    }


class ReverseGeocodeView(APIView):
    """Resolve GPS coordinates to a street-level label via Photon + OpenStreetMap."""

    def get(self, request):
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        if not lat or not lng:
            return Response({"detail": "lat and lng are required."}, status=400)

        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except (TypeError, ValueError):
            return Response({"detail": "lat and lng must be numbers."}, status=400)

        try:
            return Response(_resolve_location(lat_f, lng_f))
        except Exception:
            return Response({"detail": "Could not resolve location."}, status=502)


class StoreListView(APIView):
    def get(self, request):
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        stores = StoreLocation.objects.filter(is_active=True)
        results = []
        for s in stores:
            distance = None
            if lat and lng:
                distance = round(_haversine_km(float(lat), float(lng), s.latitude, s.longitude), 2)
            results.append({
                "id": s.id,
                "name": s.name,
                "address_text": s.address_text,
                "city": s.city,
                "state": s.state,
                "pincode": s.pincode,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "phone": s.phone,
                "opening_hours": s.opening_hours,
                "delivery_radius_km": float(s.delivery_radius_km),
                "distance_km": distance,
            })
        if lat and lng:
            results.sort(key=lambda x: x["distance_km"] or 999)
        return Response(results)
