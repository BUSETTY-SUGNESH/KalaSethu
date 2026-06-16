'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import ArtworkCard from "@/app/components/cards/ArtworkCard";
import { getUserProfile } from "@/lib/services/user-service";
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from "@/lib/services/community-service";
import { getPublishedArtworks } from "@/lib/services/artwork-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { User, Artwork } from "@/app/types";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  
  const { user: currentUser, isAuthenticated } = useAuthStore();
  
  const [profile, setProfile] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    async function loadProfile() {
      try {
        const data = await getUserProfile(profileId);
        setProfile(data);
        
        // If it's an artist, load their artworks
        if (data && (data.role === 'artist' || data.role === 'verified_artist' || data.role === 'admin')) {
          // This would ideally be a specific call to get an artist's artworks, but we can reuse getPublishedArtworks and filter
          // For a real app, you'd add a getArtworksByArtist function
          const allArtworks = await getPublishedArtworks(20);
          setArtworks(allArtworks.data.filter((a: Artwork) => a.artistId === profileId));
        }

        // Check if current user is following this profile
        if (currentUser && currentUser.id !== profileId) {
          const following = await checkIsFollowing(currentUser.id, profileId);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [profileId, currentUser]);

  async function handleToggleFollow() {
    if (!isAuthenticated || !currentUser) {
      router.push(`/login?redirect=/profile/${profileId}`);
      return;
    }
    
    if (isFollowActionLoading || !profile) return;
    
    setIsFollowActionLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.id, profileId);
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev);
      } else {
        await followUser(currentUser.id, currentUser.displayName, profileId, profile.displayName);
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
      }
    } catch (error) {
      console.error("Follow action failed", error);
    } finally {
      setIsFollowActionLoading(false);
    }
  }

  function handleMessage() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/profile/${profileId}`);
      return;
    }
    // Navigate to messages with this user
    router.push(`/dashboard/messages?userId=${profileId}`);
  }

  if (isLoading) {
    return (
      <div className="container section-gap flex flex-col items-center py-64">
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: "50%", marginBottom: 24 }} />
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: 300, height: 20, marginBottom: 32 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container section-gap empty-state py-64">
        <span className="material-symbols-outlined empty-state-icon" style={{ fontSize: 32 }}>person_off</span>
        <h1 className="text-display-sm text-primary">Profile Not Found</h1>
        <p className="text-body-lg text-on-surface-variant">The user you are looking for does not exist.</p>
        <Link href="/">
          <Button variant="primary" style={{ marginTop: 24 }}>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileId;
  const isArtist = profile.role === 'artist' || profile.role === 'verified_artist' || profile.role === 'admin';

  return (
    <>
      <div className="bg-surface-container-low border-b border-outline-variant" style={{ borderBottom: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="container" style={{ padding: "64px var(--margin-desktop) 48px" }}>
          <div className="flex flex-col items-center text-center">
            <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", marginBottom: 24, border: "4px solid var(--color-surface)", backgroundColor: "var(--color-surface-container-high)" }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: "var(--color-primary)", fontWeight: "bold" }}>
                  {profile.displayName.charAt(0)}
                </div>
              )}
            </div>
            
            <h1 className="text-display-md text-primary flex items-center justify-center gap-8" style={{ marginBottom: 8 }}>
              {profile.displayName}
              {(profile.role === 'verified_artist' || profile.isVerified) && (
                <Icon name="verified" size={24} className="text-accent-emerald" />
              )}
            </h1>
            
            <p className="text-body-lg text-on-surface-variant mb-16 capitalize">
              {profile.role.replace('_', ' ')}
            </p>

            <div className="flex gap-24 text-body-md" style={{ marginBottom: 32 }}>
              <div><strong className="text-primary">{profile.followerCount || 0}</strong> <span className="text-on-surface-variant">Followers</span></div>
              <div><strong className="text-primary">{profile.followingCount || 0}</strong> <span className="text-on-surface-variant">Following</span></div>
              {isArtist && (
                <div><strong className="text-primary">{artworks.length}</strong> <span className="text-on-surface-variant">Artworks</span></div>
              )}
            </div>

            {profile.bio && (
              <p className="text-body-md text-on-surface max-w-2xl" style={{ maxWidth: 600, margin: "0 auto 32px" }}>
                {profile.bio}
              </p>
            )}

            {!isOwnProfile ? (
              <div className="flex gap-16 justify-center">
                <Button 
                  variant={isFollowing ? "outline" : "primary"} 
                  onClick={handleToggleFollow}
                  disabled={isFollowActionLoading}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" icon="chat" iconPosition="left" onClick={handleMessage}>
                  Message
                </Button>
              </div>
            ) : (
              <Link href="/settings/profile">
                <Button variant="outline" icon="edit" iconPosition="left">Edit Profile</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="container section-gap">
        {isArtist ? (
          <div>
            <h2 className="text-headline-md text-primary" style={{ marginBottom: 32 }}>Portfolio</h2>
            
            {artworks.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
                {artworks.map((item) => (
                  <ArtworkCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    artist={item.artistName}
                    price={`₹${item.price.toLocaleString('en-IN')}`}
                    imageUrl={item.thumbnailUrl || item.images[0]?.url || "https://placehold.co/600x800"}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest text-center py-48" style={{ borderRadius: "var(--radius-lg)", border: "1px dashed rgba(196, 199, 199, 0.3)" }}>
                <Icon name="palette" size={48} className="text-on-surface-variant mb-16" />
                <p className="text-body-lg text-on-surface-variant">No public artworks available yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-64">
            <Icon name="collections_bookmark" size={48} className="text-surface-container-highest mb-16" />
            <p className="text-body-lg text-on-surface-variant">
              This user is a collector. Their saved collections are private.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
