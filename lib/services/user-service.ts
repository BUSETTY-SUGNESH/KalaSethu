// ============================================================
// KalaSetu — User Service
// Business logic layer bridging UI to Repository layer.
// ============================================================
import { userRepository } from '@/lib/repositories';
import type { User, UserProfile, UserRole, UserAddress, PaginatedResult } from '@/app/types';
import type { DocumentSnapshot } from '@/lib/firebase/firestore';

// --- Create User Profile (called after Firebase Auth signup) ---
export async function createUserProfile(
  uid: string,
  data: {
    displayName: string;
    email: string;
    avatarUrl?: string;
    role?: UserRole;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const userDoc: Omit<User, 'id'> = {
    displayName: data.displayName,
    email: data.email,
    role: data.role || 'user',
    avatarUrl: data.avatarUrl,
    isVerified: false,
    isEmailVerified: false,
    isPhoneVerified: false,
    isBanned: false,
    artworkCount: 0,
    followerCount: 0,
    followingCount: 0,
    salesCount: 0,
    totalRevenue: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await userRepository.create(uid, userDoc);
}

// --- Get User Profile ---
export async function getUserProfile(uid: string): Promise<User | null> {
  return userRepository.findById(uid);
}

// --- Update User Profile ---
export async function updateUserProfile(
  uid: string,
  data: Partial<User>
): Promise<void> {
  await userRepository.update(uid, data);
}

// --- Set User Role ---
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await userRepository.setRole(uid, role);
}

// --- Update Last Login ---
export async function updateLastLogin(uid: string): Promise<void> {
  await userRepository.touchLastLogin(uid);
}

// --- Search Users ---
export async function searchUsers(
  searchTerm: string,
  maxResults: number = 20
): Promise<User[]> {
  return userRepository.searchByName(searchTerm, maxResults);
}

// --- Get Users by Role ---
export async function getUsersByRole(
  role: UserRole,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<UserProfile>> {
  return userRepository.findByRole(role, pageSize, lastDoc);
}

// --- Get Featured Artists ---
export async function getFeaturedArtists(count: number = 10): Promise<UserProfile[]> {
  return userRepository.findFeaturedArtists(count);
}

// --- Check if User Exists ---
export async function userExists(uid: string): Promise<boolean> {
  return userRepository.exists(uid);
}

// --- Get All Users (Admin) ---
export async function getAllUsers(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot | null
): Promise<PaginatedResult<User>> {
  return userRepository.findAll(pageSize, lastDoc);
}

// --- Set User Banned Status (Admin) ---
export async function setUserBannedStatus(uid: string, isBanned: boolean): Promise<void> {
  return userRepository.setBannedStatus(uid, isBanned);
}

// --- Get Saved Addresses ---
export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  return userRepository.getAddresses(userId);
}

// --- Create Saved Address ---
export async function createUserAddress(userId: string, address: Omit<UserAddress, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return userRepository.createAddress(userId, address);
}

// --- Update Saved Address ---
export async function updateUserAddress(userId: string, addressId: string, address: Partial<UserAddress>): Promise<void> {
  return userRepository.updateAddress(userId, addressId, address);
}

// --- Delete Saved Address ---
export async function deleteUserAddress(userId: string, addressId: string): Promise<void> {
  return userRepository.deleteAddress(userId, addressId);
}

// --- Set Default Address ---
export async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
  return userRepository.setDefaultAddress(userId, addressId);
}
