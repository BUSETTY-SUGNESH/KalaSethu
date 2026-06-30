export const FEATURE_FLAGS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  ENABLE_AUCTIONS: 'enable_auctions',
  ENABLE_SOCIAL_FEED: 'enable_social_feed',
  ENABLE_ARTWORK_UPLOADS: 'enable_artwork_uploads',
} as const;

export type FeatureFlagId = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlagId, boolean> = {
  [FEATURE_FLAGS.MAINTENANCE_MODE]: false,
  [FEATURE_FLAGS.ENABLE_AUCTIONS]: true,
  [FEATURE_FLAGS.ENABLE_SOCIAL_FEED]: true,
  [FEATURE_FLAGS.ENABLE_ARTWORK_UPLOADS]: true,
};

/** Routes blocked when a feature flag is disabled (first match wins). */
export const FEATURE_FLAG_ROUTE_BLOCKS: Array<{
  flag: FeatureFlagId;
  patterns: RegExp[];
}> = [
  {
    flag: FEATURE_FLAGS.ENABLE_AUCTIONS,
    patterns: [/^\/bids(\/|$)/],
  },
  {
    flag: FEATURE_FLAGS.ENABLE_SOCIAL_FEED,
    patterns: [
      /^\/community(\/|$)/,
      /^\/dashboard\/community(\/|$)/,
    ],
  },
  {
    flag: FEATURE_FLAGS.ENABLE_ARTWORK_UPLOADS,
    patterns: [
      /^\/dashboard\/artist\/upload(\/|$)/,
      /^\/dashboard\/artist\/edit\//,
    ],
  },
];

export const MAINTENANCE_ALLOWED_PATHS = [
  /^\/maintenance$/,
  /^\/login$/,
  /^\/signup$/,
  /^\/forgot-password$/,
  /^\/api\//,
  /^\/_next\//,
  /^\/favicon\.ico$/,
];
