from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Address, OtpCode, Profile, User
from accounts.otp import (
    is_preview_host,
    issue_otp,
    normalize_phone,
    phone_internal_email,
    verify_otp,
)
from accounts.permissions import IsAuthenticatedUser
from accounts.serializers import AddressSerializer, ProfileSerializer, UserSerializer


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def ensure_profile(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


class OtpRequestView(APIView):
    def post(self, request):
        channel = request.data.get("channel", "phone")
        identifier = request.data.get("identifier", "").strip()
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()

        if channel == "phone" or phone:
            try:
                identifier = normalize_phone(phone or identifier)
            except ValueError as e:
                return Response({"ok": False, "detail": str(e)}, status=400)
            channel = "phone"
            purpose = "phone_login"
        else:
            identifier = email or identifier
            if not identifier:
                return Response({"ok": False, "detail": "Email is required."}, status=400)
            channel = "email"
            purpose = "login"

        last = (
            OtpCode.objects.filter(identifier=identifier, purpose=purpose)
            .order_by("-created_at")
            .first()
        )
        if last:
            since = (timezone.now() - last.created_at).total_seconds()
            if since < settings.OTP_RESEND_COOLDOWN:
                wait = int(settings.OTP_RESEND_COOLDOWN - since)
                return Response(
                    {"ok": False, "detail": f"Please wait {wait}s before requesting another code.", "cooldown_seconds": wait},
                    status=429,
                )

        code, row = issue_otp(identifier, channel, purpose)
        payload = {
            "ok": True,
            "sent": True,
            "expires_at": row.expires_at.isoformat(),
            "cooldown_seconds": settings.OTP_RESEND_COOLDOWN,
            "expires_in": settings.OTP_TTL_SECONDS,
            "resend_in": settings.OTP_RESEND_COOLDOWN,
        }
        if is_preview_host(request) or settings.DEBUG:
            payload["preview_code"] = code
        return Response(payload)


class OtpVerifyView(APIView):
    def post(self, request):
        channel = request.data.get("channel", "phone")
        identifier = request.data.get("identifier", "").strip()
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()
        code = str(request.data.get("code", "")).strip()
        full_name = request.data.get("full_name", "").strip()

        is_new = False
        if channel == "phone" or phone:
            try:
                e164 = normalize_phone(phone or identifier)
            except ValueError as e:
                return Response({"ok": False, "detail": str(e)}, status=400)
            local = e164[-10:]
            internal_email = phone_internal_email(local)
            purpose = "phone_login"
            ok, msg, remaining = verify_otp(e164, code, purpose)
            if not ok:
                return Response({"ok": False, "detail": msg, "attempts_remaining": remaining}, status=400)

            user = User.objects.filter(phone=e164).first()
            if not user:
                user = User.objects.filter(email=internal_email).first()
            if not user:
                user = User.objects.create(
                    phone=e164,
                    email=internal_email,
                    full_name=full_name or f"Guest {local[-4:]}",
                    is_phone_verified=True,
                )
                is_new = True
            else:
                user.is_phone_verified = True
                if full_name:
                    user.full_name = full_name
                user.save()
        else:
            identifier = email or identifier
            purpose = "login"
            ok, msg, remaining = verify_otp(identifier, code, purpose)
            if not ok:
                return Response({"ok": False, "detail": msg, "attempts_remaining": remaining}, status=400)

            user = User.objects.filter(email__iexact=identifier).first()
            if not user:
                user = User.objects.create(
                    email=identifier.lower(),
                    full_name=full_name or identifier.split("@")[0],
                    is_email_verified=True,
                )
                is_new = True
            else:
                user.is_email_verified = True
                if full_name:
                    user.full_name = full_name
                user.save()

        ensure_profile(user)
        tokens = tokens_for_user(user)
        return Response({
            "ok": True,
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "is_new": is_new,
            "is_new_user": is_new,
            "user": UserSerializer(user).data,
        })


class LoginView(APIView):
    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        password = request.data.get("password", "")
        user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(phone=identifier).first()
        if not user or not user.check_password(password):
            return Response({"detail": "Invalid credentials."}, status=401)
        tokens = tokens_for_user(user)
        return Response({"access": tokens["access"], "refresh": tokens["refresh"], "user": UserSerializer(user).data})


class BootstrapDemoUsersView(APIView):
    """
    Create demo admin/customer accounts when ALLOW_DEMO_SEED=1.
    Safe to call repeatedly (upserts passwords). Does not import catalog.
    """

    def post(self, request):
        import os

        if not settings.DEBUG and os.getenv("ALLOW_DEMO_SEED", "").lower() not in ("1", "true", "yes"):
            return Response({"detail": "Bootstrap disabled."}, status=403)

        password = "Demo@12345"
        admins = [
            ("admin@mnxstore.in", "+919000000001", "Super Admin"),
            ("manager@mnxstore.in", "+919000000002", "Store Manager"),
            ("orders@mnxstore.in", "+919000000003", "Order Desk"),
        ]
        customers = [
            ("ananya@example.com", "+919111100001", "Ananya Iyer"),
            ("ravi@example.com", "+919111100002", "Ravi Kumar"),
            ("meera@example.com", "+919111100003", "Meera Nair"),
        ]
        created = []
        updated = []

        for email, phone, name in admins:
            user, was_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "phone": phone,
                    "full_name": name,
                    "role": "admin",
                    "is_staff": True,
                    "is_phone_verified": True,
                    "is_email_verified": True,
                },
            )
            user.set_password(password)
            user.role = "admin"
            user.is_staff = True
            user.full_name = name
            user.save()
            ensure_profile(user)
            (created if was_created else updated).append(email)

        for email, phone, name in customers:
            user, was_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "phone": phone,
                    "full_name": name,
                    "role": "customer",
                    "is_phone_verified": True,
                    "is_email_verified": True,
                },
            )
            user.set_password(password)
            user.full_name = name
            user.save()
            ensure_profile(user)
            (created if was_created else updated).append(email)

        return Response(
            {
                "ok": True,
                "password": password,
                "created": created,
                "updated": updated,
                "login": "admin@mnxstore.in / Demo@12345",
            }
        )


class RefreshView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "Refresh token required."}, status=400)
        try:
            token = RefreshToken(refresh)
            return Response({"access": str(token.access_token)})
        except Exception:
            return Response({"detail": "Invalid refresh token."}, status=401)


def sync_full_name(user):
    parts = [user.first_name.strip(), user.last_name.strip()]
    user.full_name = " ".join(p for p in parts if p)


class MeView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        profile = ensure_profile(request.user)
        data = ProfileSerializer(profile).data
        data["role"] = request.user.role
        return Response(data)

    def patch(self, request):
        user = request.user
        profile = ensure_profile(user)
        data = request.data

        if "first_name" in data:
            user.first_name = str(data["first_name"]).strip()
        if "last_name" in data:
            user.last_name = str(data["last_name"]).strip()
        if "first_name" in data or "last_name" in data:
            sync_full_name(user)

        if "full_name" in data and "first_name" not in data:
            user.full_name = str(data["full_name"]).strip()
            parts = user.full_name.split(None, 1)
            user.first_name = parts[0] if parts else ""
            user.last_name = parts[1] if len(parts) > 1 else ""

        if "gst_number" in data:
            profile.gst_number = str(data["gst_number"]).strip().upper()

        if "avatar_url" in data:
            profile.avatar_url = data["avatar_url"]

        if not user.first_name.strip() or not user.last_name.strip():
            return Response({"detail": "First name and last name are required."}, status=400)

        if not user.phone or not user.is_phone_verified:
            return Response({"detail": "Verify your phone number before completing your profile."}, status=400)

        if not user.email or not user.is_email_verified:
            return Response({"detail": "Verify your email address before completing your profile."}, status=400)

        user.save()
        profile.save()
        out = ProfileSerializer(profile).data
        out["role"] = user.role
        return Response(out)


class ProfileOtpRequestView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        channel = request.data.get("channel", "phone")
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()

        if channel == "phone" or phone:
            try:
                identifier = normalize_phone(phone or request.data.get("identifier", ""))
            except ValueError as e:
                return Response({"ok": False, "detail": str(e)}, status=400)
            channel = "phone"
            purpose = "verify_phone"
        else:
            identifier = (email or request.data.get("identifier", "")).strip().lower()
            if not identifier:
                return Response({"ok": False, "detail": "Email is required."}, status=400)
            channel = "email"
            purpose = "verify_email"

        last = (
            OtpCode.objects.filter(identifier=identifier, purpose=purpose)
            .order_by("-created_at")
            .first()
        )
        if last:
            since = (timezone.now() - last.created_at).total_seconds()
            if since < settings.OTP_RESEND_COOLDOWN:
                wait = int(settings.OTP_RESEND_COOLDOWN - since)
                return Response(
                    {"ok": False, "detail": f"Please wait {wait}s before requesting another code.", "cooldown_seconds": wait},
                    status=429,
                )

        code, row = issue_otp(identifier, channel, purpose)
        payload = {
            "ok": True,
            "sent": True,
            "expires_at": row.expires_at.isoformat(),
            "cooldown_seconds": settings.OTP_RESEND_COOLDOWN,
            "expires_in": settings.OTP_TTL_SECONDS,
            "resend_in": settings.OTP_RESEND_COOLDOWN,
        }
        if is_preview_host(request) or settings.DEBUG:
            payload["preview_code"] = code
        return Response(payload)


class ProfileOtpVerifyView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        channel = request.data.get("channel", "phone")
        phone = request.data.get("phone", "").strip()
        email = request.data.get("email", "").strip()
        code = str(request.data.get("code", "")).strip()
        user = request.user

        if channel == "phone" or phone:
            try:
                e164 = normalize_phone(phone or request.data.get("identifier", ""))
            except ValueError as e:
                return Response({"ok": False, "detail": str(e)}, status=400)
            purpose = "verify_phone"
            ok, msg, remaining = verify_otp(e164, code, purpose)
            if not ok:
                return Response({"ok": False, "detail": msg, "attempts_remaining": remaining}, status=400)
            if User.objects.filter(phone=e164).exclude(id=user.id).exists():
                return Response({"ok": False, "detail": "This phone number is already registered."}, status=400)
            user.phone = e164
            user.is_phone_verified = True
        else:
            identifier = (email or request.data.get("identifier", "")).strip().lower()
            purpose = "verify_email"
            ok, msg, remaining = verify_otp(identifier, code, purpose)
            if not ok:
                return Response({"ok": False, "detail": msg, "attempts_remaining": remaining}, status=400)
            if User.objects.filter(email__iexact=identifier).exclude(id=user.id).exists():
                return Response({"ok": False, "detail": "This email address is already registered."}, status=400)
            user.email = identifier
            user.is_email_verified = True

        user.save()
        profile = ensure_profile(user)
        return Response({
            "ok": True,
            "profile": ProfileSerializer(profile).data,
        })


class ProfileAvatarUploadView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        import os
        import uuid as uuid_mod

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file."}, status=400)
        allowed = {"image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"}
        if file.content_type not in allowed:
            return Response({"detail": "Use a PNG, JPG, WEBP, AVIF or GIF image."}, status=400)
        if file.size > 8 * 1024 * 1024:
            return Response({"detail": "Image must be smaller than 8 MB."}, status=400)

        ext = os.path.splitext(file.name)[1] or ".jpg"
        filename = f"avatars/{uuid_mod.uuid4().hex}{ext}"
        path = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)

        media_base = getattr(settings, "MEDIA_PUBLIC_BASE_URL", "").rstrip("/")
        if media_base:
            url = f"{media_base}/{filename}"
        else:
            url = request.build_absolute_uri(settings.MEDIA_URL + filename)

        profile = ensure_profile(request.user)
        profile.avatar_url = url
        profile.save(update_fields=["avatar_url", "updated_at"])

        return Response({"url": url, "path": filename, "avatar_url": url}, status=201)

    def delete(self, request):
        import os

        profile = ensure_profile(request.user)
        if profile.avatar_url:
            # Best-effort file cleanup when stored locally
            if "/media/" in profile.avatar_url:
                rel = profile.avatar_url.split("/media/", 1)[-1]
                path = os.path.join(settings.MEDIA_ROOT, rel)
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
            elif profile.avatar_url.startswith(settings.MEDIA_URL):
                rel = profile.avatar_url[len(settings.MEDIA_URL) :]
                path = os.path.join(settings.MEDIA_ROOT, rel)
                if os.path.isfile(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass
        profile.avatar_url = ""
        profile.save(update_fields=["avatar_url", "updated_at"])
        return Response({"ok": True, "avatar_url": ""})


class VerificationView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        profile = ensure_profile(request.user)
        return Response(ProfileSerializer(profile).data)

    def post(self, request):
        profile = ensure_profile(request.user)
        user = request.user
        user.full_name = request.data.get("full_name", user.full_name)
        user.phone = request.data.get("phone", user.phone)
        user.save()
        profile.address_text = request.data.get("address_text", "")
        profile.pincode = request.data.get("pincode", "")
        profile.latitude = request.data.get("latitude")
        profile.longitude = request.data.get("longitude")
        profile.location_accuracy_m = request.data.get("location_accuracy_m")
        profile.verification_status = Profile.VerificationStatus.SUBMITTED
        profile.submitted_at = timezone.now()
        profile.rejection_reason = ""
        profile.save()
        return Response(ProfileSerializer(profile).data)


class AddressListView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        qs = Address.objects.filter(user=request.user).order_by("-is_default", "created_at")
        return Response(AddressSerializer(qs, many=True).data)

    def post(self, request):
        data = request.data.copy()
        if data.get("is_default"):
            Address.objects.filter(user=request.user).update(is_default=False)
        serializer = AddressSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        addr = Address.objects.create(user=request.user, **serializer.validated_data)
        return Response(AddressSerializer(addr).data, status=201)


class AddressDetailView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get_object(self, request, pk):
        return Address.objects.get(id=pk, user=request.user)

    def patch(self, request, pk):
        addr = self.get_object(request, pk)
        if request.data.get("is_default"):
            Address.objects.filter(user=request.user).update(is_default=False)
        serializer = AddressSerializer(addr, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for k, v in serializer.validated_data.items():
            setattr(addr, k, v)
        addr.save()
        return Response(AddressSerializer(addr).data)

    def delete(self, request, pk):
        addr = self.get_object(request, pk)
        addr.delete()
        return Response(status=204)


class AddressDefaultView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request, pk):
        Address.objects.filter(user=request.user).update(is_default=False)
        addr = Address.objects.get(id=pk, user=request.user)
        addr.is_default = True
        addr.save()
        return Response(AddressSerializer(addr).data)
