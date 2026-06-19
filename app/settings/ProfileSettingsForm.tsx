"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { updateUserProfile as updateFirebaseProfile, changePassword } from "@/lib/firebase/auth";
import { uploadAvatar, validateImageFile } from "@/lib/firebase/storage";
import {
  updateUserProfile as saveUserProfile,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress
} from "@/lib/services/user-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import type { UserAddress } from "@/app/types";

type ActiveTab = "profile" | "addresses" | "security";

export default function ProfileSettingsForm() {
  const { user, setUser } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [isSaving, setIsSaving] = useState(false);

  // Tab 1: Profile State
  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    location: "",
    website: "",
    specialty: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Tab 2: Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressFormId, setAddressFormId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    isDefault: false
  });

  // Tab 3: Security & Preferences State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      sms: false,
      marketing: false
    },
    privacy: {
      showPortfolio: true,
      showEmail: false,
      showActivity: true
    }
  });

  useEffect(() => {
    if (!user) return;
    setProfileData({
      displayName: user.displayName || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      specialty: user.specialty || "",
    });
    setAvatarPreview(user.avatarUrl || "");
    
    // Load preferences from user doc if exists
    if ((user as any).preferences) {
      setPreferences({
        notifications: {
          email: true,
          sms: false,
          marketing: false,
          ...(user as any).preferences.notifications
        },
        privacy: {
          showPortfolio: true,
          showEmail: false,
          showActivity: true,
          ...(user as any).preferences.privacy
        }
      });
    }

    if (activeTab === "addresses") {
      loadAddresses();
    }
  }, [user, activeTab]);

  // --- Load Addresses ---
  async function loadAddresses() {
    if (!user) return;
    setIsLoadingAddresses(true);
    try {
      const data = await getUserAddresses(user.id);
      setAddresses(data);
    } catch (error) {
      console.error("Failed to load addresses", error);
      addToast({ type: "error", title: "Error", message: "Failed to load shipping addresses." });
    } finally {
      setIsLoadingAddresses(false);
    }
  }

  // --- Profile Avatar Selection ---
  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      addToast({ type: "error", title: "Invalid Avatar", message: validationError });
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  // --- Save Profile ---
  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      let avatarUrl = user.avatarUrl;
      if (avatarFile) {
        const upload = await uploadAvatar(user.id, avatarFile);
        avatarUrl = upload.downloadURL;
      }

      const updates = {
        displayName: profileData.displayName.trim(),
        bio: profileData.bio.trim(),
        location: profileData.location.trim(),
        website: profileData.website.trim(),
        specialty: profileData.specialty.trim(),
        avatarUrl,
      };

      await saveUserProfile(user.id, updates);
      await updateFirebaseProfile({
        displayName: updates.displayName,
        photoURL: avatarUrl,
      });

      setUser({ ...user, ...updates });
      setAvatarFile(null);
      addToast({
        type: "success",
        title: "Profile Updated",
        message: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save profile", error);
      addToast({
        type: "error",
        title: "Save Failed",
        message: "We could not update your profile right now.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // --- Address Creation & Editing ---
  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const addressData = {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        addressLine1: addressForm.addressLine1.trim(),
        addressLine2: addressForm.addressLine2.trim() || undefined,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        country: addressForm.country,
        isDefault: addressForm.isDefault
      };

      if (addressFormId) {
        // Edit Mode
        await updateUserAddress(user.id, addressFormId, addressData);
        addToast({ type: "success", title: "Address Updated", message: "Shipping address updated." });
      } else {
        // Create Mode
        await createUserAddress(user.id, addressData);
        addToast({ type: "success", title: "Address Created", message: "Shipping address added." });
      }

      // Reset form & reload
      resetAddressForm();
      await loadAddresses();
    } catch (error) {
      console.error("Address submit failed", error);
      addToast({ type: "error", title: "Error", message: "Failed to save shipping address." });
    } finally {
      setIsSaving(false);
    }
  }

  function startEditAddress(addr: UserAddress) {
    setAddressFormId(addr.id);
    setAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country,
      isDefault: addr.isDefault
    });
    setIsEditingAddress(true);
  }

  async function handleDeleteAddress(addressId: string) {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await deleteUserAddress(user.id, addressId);
      addToast({ type: "success", title: "Address Deleted", message: "Shipping address removed." });
      await loadAddresses();
    } catch (error) {
      console.error("Delete address failed", error);
      addToast({ type: "error", title: "Error", message: "Failed to delete address." });
    }
  }

  async function handleSetDefaultAddress(addressId: string) {
    if (!user) return;
    try {
      await setDefaultAddress(user.id, addressId);
      addToast({ type: "success", title: "Default Saved", message: "Default shipping address set." });
      await loadAddresses();
    } catch (error) {
      console.error("Set default address failed", error);
      addToast({ type: "error", title: "Error", message: "Failed to update default address." });
    }
  }

  function resetAddressForm() {
    setIsEditingAddress(false);
    setAddressFormId(null);
    setAddressForm({
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      isDefault: false
    });
  }

  // --- Save Security Settings / Preferences ---
  async function handlePreferencesSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      // 1. Password updates
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          addToast({ type: "error", title: "Match Error", message: "Passwords do not match." });
          setIsSaving(false);
          return;
        }
        await changePassword(newPassword);
        setNewPassword("");
        setConfirmPassword("");
        addToast({ type: "success", title: "Security Saved", message: "Password updated successfully." });
      }

      // 2. Preferences updates
      await saveUserProfile(user.id, { preferences });
      setUser({ ...user, preferences } as any);
      
      addToast({
        type: "success",
        title: "Preferences Saved",
        message: "Your privacy and notification preferences have been saved.",
      });
    } catch (error) {
      console.error("Failed to save preferences", error);
      addToast({
        type: "error",
        title: "Save Failed",
        message: "Failed to update settings preferences.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="container section-gap empty-state">
        <Icon name="lock" size={40} className="empty-state-icon" />
        <h1 className="text-headline-md text-primary">Sign in required</h1>
        <p className="text-body-md text-on-surface-variant">
          Log in to edit your KalaSetu profile.
        </p>
        <Link href="/login?redirect=/settings/profile">
          <Button variant="primary">Log In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container section-gap" style={{ maxWidth: 1024, margin: "0 auto" }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="text-display-sm text-primary">Settings</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            Manage your public profile, shipping addresses, security, and notification preferences.
          </p>
        </div>
        <Link href={`/profile/${user.id}`}>
          <Button variant="outline" icon="visibility" iconPosition="left">
            View Profile
          </Button>
        </Link>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-16 border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)", marginBottom: 32 }}>
        <button
          onClick={() => setActiveTab("profile")}
          className={`text-label-md ${activeTab === "profile" ? "text-primary" : "text-on-surface-variant"}`}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "profile" ? "3px solid var(--color-primary)" : "3px solid transparent",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: -2
          }}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab("addresses")}
          className={`text-label-md ${activeTab === "addresses" ? "text-primary" : "text-on-surface-variant"}`}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "addresses" ? "3px solid var(--color-primary)" : "3px solid transparent",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: -2
          }}
        >
          Shipping Addresses
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`text-label-md ${activeTab === "security" ? "text-primary" : "text-on-surface-variant"}`}
          style={{
            padding: "12px 24px",
            borderBottom: activeTab === "security" ? "3px solid var(--color-primary)" : "3px solid transparent",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            marginBottom: -2
          }}
        >
          Security & Privacy
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === "profile" && (
        <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <form onSubmit={handleProfileSave} className="flex flex-col gap-24">
            <div className="flex items-center gap-24">
              <div className="avatar avatar-xl" style={{ backgroundColor: "var(--color-surface-container-high)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt={profileData.displayName || "Profile avatar"} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                ) : (
                  <span className="text-headline-md text-primary">
                    {(profileData.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-8">
                <label className="btn btn-outline btn-sm" style={{ width: "fit-content", cursor: "pointer" }}>
                  Change Avatar
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <span className="text-caption text-on-surface-variant">JPG, PNG, WEBP, AVIF up to 10MB.</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.displayName}
                  onChange={(event) => setProfileData({ ...profileData, displayName: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={user.email} disabled />
                <span className="text-caption text-on-surface-variant">Email is managed by Firebase Authentication.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                className="form-textarea"
                value={profileData.bio}
                onChange={(event) => setProfileData({ ...profileData, bio: event.target.value })}
                rows={4}
                placeholder="Tell collectors and artists about your practice, interests, or collecting focus."
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.location}
                  onChange={(event) => setProfileData({ ...profileData, location: event.target.value })}
                  placeholder="City, State"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input
                  type="url"
                  className="form-input"
                  value={profileData.website}
                  onChange={(event) => setProfileData({ ...profileData, website: event.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {(user.role === "artist" || user.role === "verified_artist" || user.role === "admin") && (
              <div className="form-group">
                <label className="form-label">Artist Specialty</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData.specialty}
                  onChange={(event) => setProfileData({ ...profileData, specialty: event.target.value })}
                  placeholder="Madhubani painting, bronze casting, textiles..."
                />
              </div>
            )}

            <div style={{ paddingTop: 24, borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Addresses */}
      {activeTab === "addresses" && (
        <div className="flex flex-col gap-32">
          {/* Header/Form Toggle */}
          <div className="flex justify-between items-center">
            <h2 className="text-headline-md text-primary">Saved Shipping Addresses</h2>
            {!isEditingAddress && (
              <Button variant="primary" icon="add" iconPosition="left" onClick={() => setIsEditingAddress(true)}>
                Add New Address
              </Button>
            )}
          </div>

          {/* Address Edit Form */}
          {isEditingAddress && (
            <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid var(--color-primary)" }}>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>
                {addressFormId ? "Edit Address" : "Add Shipping Address"}
              </h3>
              <form onSubmit={handleAddressSubmit} className="flex flex-col gap-24">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Address Line 1</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                      placeholder="Street address, P.O. box, company name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.addressLine2}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                      placeholder="Apartment, suite, unit, building, floor"
                    />
                  </div>
                </div>

                <div className="grid-4">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input type="text" className="form-input" value="India" disabled />
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <input
                    type="checkbox"
                    id="address-default"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: "var(--color-primary)" }}
                  />
                  <label htmlFor="address-default" className="text-body-md text-on-surface" style={{ cursor: "pointer" }}>
                    Set as default shipping address
                  </label>
                </div>

                <div className="flex gap-16 justify-end pt-16" style={{ borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
                  <Button type="button" variant="ghost" onClick={resetAddressForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Address"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Saved Addresses List */}
          {isLoadingAddresses ? (
            <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
          ) : addresses.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-surface-container-lowest"
                  style={{
                    padding: 24,
                    borderRadius: "var(--radius-lg)",
                    border: addr.isDefault ? "2px solid var(--color-primary)" : "1px solid rgba(196, 199, 199, 0.2)",
                    position: "relative"
                  }}
                >
                  {addr.isDefault && (
                    <span
                      className="text-label-sm uppercase bg-primary text-surface px-2 py-1 rounded"
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        backgroundColor: "var(--color-primary)",
                        color: "white",
                        padding: "4px 8px",
                        fontSize: 10,
                        borderRadius: 4,
                        fontWeight: "bold"
                      }}
                    >
                      Default
                    </span>
                  )}
                  <h4 className="text-title-md text-primary" style={{ marginBottom: 12, paddingRight: 64 }}>
                    {addr.fullName}
                  </h4>
                  <p className="text-body-md text-on-surface" style={{ lineHeight: 1.5, marginBottom: 8 }}>
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                    <br />
                    {addr.city}, {addr.state} – {addr.pincode}
                  </p>
                  <p className="text-caption text-on-surface-variant" style={{ marginBottom: 24 }}>
                    Phone: {addr.phone}
                  </p>

                  <div className="flex gap-16 border-t border-outline-variant pt-16" style={{ borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
                    <button
                      onClick={() => startEditAddress(addr)}
                      style={{ border: "none", background: "none", color: "var(--color-primary)", cursor: "pointer", fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      style={{ border: "none", background: "none", color: "var(--color-status-urgency)", cursor: "pointer", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        style={{ border: "none", background: "none", color: "var(--color-accent-emerald)", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isEditingAddress && (
              <div className="empty-state">
                <Icon name="local_shipping" size={40} className="empty-state-icon" />
                <p className="text-body-lg text-on-surface-variant">No shipping addresses saved yet.</p>
                <Button variant="outline" onClick={() => setIsEditingAddress(true)}>
                  Add First Address
                </Button>
              </div>
            )
          )}
        </div>
      )}

      {/* Tab 3: Security & Privacy */}
      {activeTab === "security" && (
        <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <form onSubmit={handlePreferencesSave} className="flex flex-col gap-32">
            
            {/* Change Password */}
            <div>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Change Password</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(196, 199, 199, 0.2)" }} />

            {/* Notification Preferences */}
            <div>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Notification Preferences</h3>
              <div className="flex flex-col gap-16">
                <div className="flex items-start gap-12">
                  <input
                    type="checkbox"
                    id="notif-email"
                    checked={preferences.notifications.email}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, email: e.target.checked }
                    })}
                    style={{ width: 18, height: 18, accentColor: "var(--color-primary)", marginTop: 2 }}
                  />
                  <div>
                    <label htmlFor="notif-email" className="text-label-md text-primary" style={{ cursor: "pointer" }}>Email Updates</label>
                    <p className="text-caption text-on-surface-variant">Receive email notifications for order status, bidding results, and new messages.</p>
                  </div>
                </div>

                <div className="flex items-start gap-12">
                  <input
                    type="checkbox"
                    id="notif-sms"
                    checked={preferences.notifications.sms}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, sms: e.target.checked }
                    })}
                    style={{ width: 18, height: 18, accentColor: "var(--color-primary)", marginTop: 2 }}
                  />
                  <div>
                    <label htmlFor="notif-sms" className="text-label-md text-primary" style={{ cursor: "pointer" }}>SMS Notifications</label>
                    <p className="text-caption text-on-surface-variant">Receive text messages for instant alerts such as outbidding and parcel tracking.</p>
                  </div>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(196, 199, 199, 0.2)" }} />

            {/* Privacy Settings */}
            <div>
              <h3 className="text-headline-sm text-primary" style={{ marginBottom: 16 }}>Privacy Settings</h3>
              <div className="flex flex-col gap-16">
                <div className="flex items-start gap-12">
                  <input
                    type="checkbox"
                    id="privacy-portfolio"
                    checked={preferences.privacy.showPortfolio}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      privacy: { ...preferences.privacy, showPortfolio: e.target.checked }
                    })}
                    style={{ width: 18, height: 18, accentColor: "var(--color-primary)", marginTop: 2 }}
                  />
                  <div>
                    <label htmlFor="privacy-portfolio" className="text-label-md text-primary" style={{ cursor: "pointer" }}>Show Portfolio publicly</label>
                    <p className="text-caption text-on-surface-variant">Allow collectors to view your portfolio and past work on your public profile page.</p>
                  </div>
                </div>

                <div className="flex items-start gap-12">
                  <input
                    type="checkbox"
                    id="privacy-email"
                    checked={preferences.privacy.showEmail}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      privacy: { ...preferences.privacy, showEmail: e.target.checked }
                    })}
                    style={{ width: 18, height: 18, accentColor: "var(--color-primary)", marginTop: 2 }}
                  />
                  <div>
                    <label htmlFor="privacy-email" className="text-label-md text-primary" style={{ cursor: "pointer" }}>Show Email Address publicly</label>
                    <p className="text-caption text-on-surface-variant">Display your email address on your public profile for business and verification inquiries.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 24, borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? "Saving Settings..." : "Save Settings & Security"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
