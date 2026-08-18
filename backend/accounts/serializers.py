from rest_framework import serializers

from accounts.models import Address, Profile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "phone", "email", "first_name", "last_name", "full_name", "role",
            "is_phone_verified", "is_email_verified",
        )


class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="user_id", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)
    full_name = serializers.CharField(source="user.full_name", required=False)
    phone = serializers.CharField(source="user.phone", required=False)
    email = serializers.EmailField(source="user.email", required=False)
    is_phone_verified = serializers.BooleanField(source="user.is_phone_verified", read_only=True)
    is_email_verified = serializers.BooleanField(source="user.is_email_verified", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id", "first_name", "last_name", "full_name", "phone", "email",
            "is_phone_verified", "is_email_verified",
            "avatar_url", "gst_number", "verification_status", "address_text",
            "pincode", "latitude", "longitude", "location_accuracy_m", "rejection_reason",
            "submitted_at", "verified_at",
        )


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id", "label", "recipient_name", "phone", "line1", "line2", "landmark",
            "city", "state", "pincode", "latitude", "longitude", "is_default",
        )
