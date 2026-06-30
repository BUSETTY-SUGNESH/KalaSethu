import type { UserRole } from "@/app/types";

interface RoleBadgeProps {
  role: UserRole | string;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const isArtistRole = role === "artist" || role === "verified_artist";
  return (
    <span
      className={isArtistRole ? "role-badge role-badge--seller" : "role-badge role-badge--buyer"}
    >
      <span className="material-symbols-outlined role-badge__icon">
        {isArtistRole ? "palette" : "person"}
      </span>
      {isArtistRole ? "Seller" : "Buyer"}
    </span>
  );
}
