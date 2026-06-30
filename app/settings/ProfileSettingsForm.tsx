"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import Modal from "@/app/components/ui/Modal";
import { updateUserProfile as updateFirebaseProfile, changePassword, hasPasswordProvider } from "@/lib/firebase/auth";
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
import type { User, UserAddress } from "@/app/types";

type ActiveTab = "profile" | "addresses" | "security";

type PreferencesState = {
  notifications: {
    email: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    showPortfolio: boolean;
    showEmail: boolean;
    showActivity: boolean;
  };
};

const DEFAULT_PREFERENCES: PreferencesState = {
  notifications: {
    email: true,
    sms: false,
    marketing: false,
  },
  privacy: {
    showPortfolio: true,
    showEmail: false,
    showActivity: true,
  },
};

const EMPTY_ADDRESS_FORM = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
};

const TAB_BAR_STYLE = {
  marginBottom: 32,
  borderBottomWidth: 1,
  borderBottomStyle: "solid" as const,
  borderBottomColor: "rgba(196, 199, 199, 0.2)",
};

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: "12px 24px",
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderLeftStyle: "solid",
    borderBottomStyle: "solid",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderLeftColor: "transparent",
    borderBottomColor: isActive ? "var(--color-primary)" : "transparent",
    background: "none",
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: -2,
  };
}

function buildPreferencesFromUser(user: User): PreferencesState {
  const stored = (user as User & { preferences?: Partial<PreferencesState> }).preferences;
  return {
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...stored?.notifications,
    },
    privacy: {
      ...DEFAULT_PREFERENCES.privacy,
      ...stored?.privacy,
    },
  };
}

function arePreferencesEqual(a: PreferencesState, b: PreferencesState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ProfileSettingsForm() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { addToast } = useUIStore();

  const hydratedUserIdRef = useRef<string | null>(null);
  const avatarBlobUrlRef = useRef<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Tab 1: Profile State
  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    location: "",
    specialty: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Tab 2: Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressFormId, setAddressFormId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({ ...EMPTY_ADDRESS_FORM });

  // Tab 3: Security & Preferences State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [canChangePassword, setCanChangePassword] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);

  const hydrateFromUser = useCallback((sourceUser: User) => {
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
      avatarBlobUrlRef.current = null;
    }

    setProfileData({
      displayName: sourceUser.displayName || "",
      bio: sourceUser.bio || "",
      location: sourceUser.location || "",
      specialty: sourceUser.specialty || "",
    });
    setAvatarPreview(sourceUser.avatarUrl || "");
    setAvatarFile(null);
    setPreferences(buildPreferencesFromUser(sourceUser));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditingAddress(false);
    setAddressFormId(null);
    setAddressForm({ ...EMPTY_ADDRESS_FORM });
  }, []);

  useEffect(() => {
    setCanChangePassword(hasPasswordProvider());
  }, [user]);

  useEffect(() => {
    if (!user) {
      hydratedUserIdRef.current = null;
      return;
    }

    if (hydratedUserIdRef.current === user.id) return;
    hydratedUserIdRef.current = user.id;
    hydrateFromUser(user);
  }, [user, hydrateFromUser]);

  // --- Load Addresses ---
  const loadAddresses = useCallback(async () => {
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
  }, [user, addToast]);

  useEffect(() => {
    if (!user || activeTab !== "addresses") return;
    void loadAddresses();
  }, [user, activeTab, loadAddresses]);

  useEffect(() => {
    return () => {
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
      }
    };
  }, []);

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
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    avatarBlobUrlRef.current = blobUrl;
    setAvatarPreview(blobUrl);
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
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
        avatarBlobUrlRef.current = null;
      }
      setAvatarPreview(avatarUrl || "");
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
    setAddressForm({ ...EMPTY_ADDRESS_FORM });
  }

  const savedPreferences = useMemo(
    () => (user ? buildPreferencesFromUser(user) : DEFAULT_PREFERENCES),
    [user]
  );

  const isProfileDirty = useMemo(() => {
    if (!user) return false;
    if (avatarFile) return true;
    return (
      profileData.displayName !== (user.displayName || "") ||
      profileData.bio !== (user.bio || "") ||
      profileData.location !== (user.location || "") ||
      profileData.specialty !== (user.specialty || "")
    );
  }, [user, profileData, avatarFile]);

  const isSecurityDirty = useMemo(() => {
    if (!user) return false;
    if (currentPassword || newPassword || confirmPassword) return true;
    return !arePreferencesEqual(preferences, savedPreferences);
  }, [user, currentPassword, newPassword, confirmPassword, preferences, savedPreferences]);

  const isAddressFormDirty = useMemo(() => {
    if (!isEditingAddress) return false;
    if (!addressFormId) {
      return Boolean(
        addressForm.fullName.trim() ||
        addressForm.phone.trim() ||
        addressForm.addressLine1.trim() ||
        addressForm.addressLine2.trim() ||
        addressForm.city.trim() ||
        addressForm.state.trim() ||
        addressForm.pincode.trim() ||
        addressForm.isDefault
      );
    }
    const original = addresses.find((addr) => addr.id === addressFormId);
    if (!original) return true;
    return (
      addressForm.fullName !== original.fullName ||
      addressForm.phone !== original.phone ||
      addressForm.addressLine1 !== original.addressLine1 ||
      (addressForm.addressLine2 || "") !== (original.addressLine2 || "") ||
      addressForm.city !== original.city ||
      addressForm.state !== original.state ||
      addressForm.pincode !== original.pincode ||
      addressForm.country !== original.country ||
      addressForm.isDefault !== original.isDefault
    );
  }, [isEditingAddress, addressFormId, addressForm, addresses]);

  const hasUnsavedChanges = isProfileDirty || isSecurityDirty || isAddressFormDirty;

  const requestNavigation = useCallback((action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => action);
      setShowLeaveDialog(true);
      return;
    }
    action();
  }, [hasUnsavedChanges]);

  function handleBack() {
    requestNavigation(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      if (user) {
        router.push(`/profile/${user.id}`);
        return;
      }
      router.push("/dashboard");
    });
  }

  function handleDiscardChanges() {
    if (!user) return;
    hydrateFromUser(user);
    setShowLeaveDialog(false);
    setPendingNavigation(null);
  }

  function handleConfirmLeave() {
    const action = pendingNavigation;
    setShowLeaveDialog(false);
    setPendingNavigation(null);
    action?.();
  }

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // --- Save Security Settings / Preferences ---
  async function handlePreferencesSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      // 1. Password updates
      if (newPassword) {
        if (!canChangePassword) {
          addToast({ type: "error", title: "Not Available", message: "Password is managed by your sign-in provider." });
          setIsSaving(false);
          return;
        }
        if (!currentPassword) {
          addToast({ type: "error", title: "Required", message: "Enter your current password to continue." });
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          addToast({ type: "error", title: "Match Error", message: "Passwords do not match." });
          setIsSaving(false);
          return;
        }
        await changePassword(newPassword, currentPassword);
        setCurrentPassword("");
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
    } catch (error: unknown) {
      console.error("Failed to save preferences", error);
      const code = (error as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        addToast({
          type: "error",
          title: "Incorrect Password",
          message: "Your current password is incorrect.",
        });
      } else if (code === "auth/requires-recent-login") {
        addToast({
          type: "error",
          title: "Re-authentication Required",
          message: "Please sign out and sign in again, then retry changing your password.",
        });
      } else {
        addToast({
          type: "error",
          title: "Save Failed",
          message: "Failed to update settings preferences.",
        });
      }
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
      <div style={{ marginBottom: 24 }}>
        <Button
          variant="ghost"
          icon="arrow_back"
          iconPosition="left"
          onClick={handleBack}
        >
          Back
        </Button>
      </div>

      <div className="flex justify-between items-start" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="text-display-sm text-primary">Settings</h1>
          <p className="text-body-md text-on-surface-variant" style={{ marginTop: 8 }}>
            Manage your public profile, shipping addresses, security, and notification preferences.
          </p>
        </div>
        <Button
          variant="outline"
          icon="visibility"
          iconPosition="left"
          onClick={() => requestNavigation(() => router.push(`/profile/${user.id}`))}
        >
          View Profile
        </Button>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-16" style={TAB_BAR_STYLE}>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`text-label-md ${activeTab === "profile" ? "text-primary" : "text-on-surface-variant"}`}
          style={getTabButtonStyle(activeTab === "profile")}
        >
          Profile Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`text-label-md ${activeTab === "addresses" ? "text-primary" : "text-on-surface-variant"}`}
          style={getTabButtonStyle(activeTab === "addresses")}
        >
          Shipping Addresses
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`text-label-md ${activeTab === "security" ? "text-primary" : "text-on-surface-variant"}`}
          style={getTabButtonStyle(activeTab === "security")}
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

            <div
              style={{
                paddingTop: 24,
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "rgba(196, 199, 199, 0.2)",
              }}
            >
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

                <div
                  className="flex gap-16 justify-end pt-16"
                  style={{
                    borderTopWidth: 1,
                    borderTopStyle: "solid",
                    borderTopColor: "rgba(196, 199, 199, 0.2)",
                  }}
                >
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

                  <div
                    className="flex gap-16 pt-16"
                    style={{
                      borderTopWidth: 1,
                      borderTopStyle: "solid",
                      borderTopColor: "rgba(196, 199, 199, 0.2)",
                    }}
                  >
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
              {canChangePassword ? (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      autoComplete="new-password"
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
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">
                  Password is managed by your Google account. Use Google account settings to change it.
                </p>
              )}
            </div>

            <hr
              style={{
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "rgba(196, 199, 199, 0.2)",
                borderRightWidth: 0,
                borderBottomWidth: 0,
                borderLeftWidth: 0,
                borderRightStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderLeftColor: "transparent",
              }}
            />

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

            <hr
              style={{
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "rgba(196, 199, 199, 0.2)",
                borderRightWidth: 0,
                borderBottomWidth: 0,
                borderLeftWidth: 0,
                borderRightStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                borderLeftColor: "transparent",
              }}
            />

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

            <div
              style={{
                paddingTop: 24,
                borderTopWidth: 1,
                borderTopStyle: "solid",
                borderTopColor: "rgba(196, 199, 199, 0.2)",
              }}
            >
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? "Saving Settings..." : "Save Settings & Security"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <Modal
        open={showLeaveDialog}
        onClose={() => {
          setShowLeaveDialog(false);
          setPendingNavigation(null);
        }}
        title="Unsaved changes"
        size="md"
        footer={
          <div className="flex gap-16 justify-end">
            <Button variant="ghost" onClick={() => {
              setShowLeaveDialog(false);
              setPendingNavigation(null);
            }}>
              Stay on page
            </Button>
            <Button variant="outline" onClick={handleDiscardChanges}>
              Discard changes
            </Button>
            <Button variant="primary" onClick={handleConfirmLeave}>
              Leave without saving
            </Button>
          </div>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          You have unsaved changes on this page. Leave without saving, or stay to keep editing.
        </p>
      </Modal>
    </div>
  );
}
