/**
 * Metadata utility for managing meta descriptions and Open Graph tags
 * across all pages in the application.
 */

export interface PageMetadata {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
}

/**
 * Route-specific metadata definitions
 * Each route should have a description for SEO and social sharing
 */
export const ROUTE_METADATA: Record<string, PageMetadata> = {
  "/": {
    title: "Higher Self — AI-Powered Personal Growth",
    description:
      "Track growth across 6 life domains with daily check-ins and AI insights. Your journey to becoming your higher self starts here.",
    ogType: "website",
  },
  "/chat": {
    title: "Talk to Mirror — Higher Self",
    description:
      "Have deep conversations with your AI Mirror. Get personalized guidance, explore your thoughts, and discover patterns in your behavior.",
    ogType: "website",
  },
  "/journal": {
    title: "Journal — Higher Self",
    description:
      "Capture your thoughts and reflections. Your journal entries help build a rich history of your personal growth journey.",
    ogType: "website",
  },
  "/domains": {
    title: "Positive Habits — Higher Self",
    description:
      "Track habits and growth across Mindset, Relationships, Work, Health, Spirituality, and Finances. Build consistency with habit streaks and domain scores.",
    ogType: "website",
  },
  "/calendar": {
    title: "Calendar — Higher Self",
    description:
      "Visualize your commitments and milestones. Plan your growth journey with integrated calendar events and habit tracking.",
    ogType: "website",
  },
  "/insights": {
    title: "Insights — Higher Self",
    description:
      "Discover AI-generated insights about your patterns, growth, and potential. Get actionable steps to accelerate your personal development.",
    ogType: "website",
  },
  "/checkin": {
    title: "Daily Check-in — Higher Self",
    description:
      "Complete your daily check-in by rating your mood, energy, and stress. Track your emotional state and build awareness.",
    ogType: "website",
  },
  "/settings": {
    title: "Settings — Higher Self",
    description: "Manage your profile, preferences, and account settings.",
    ogType: "website",
  },
  "/notifications": {
    title: "Notifications — Higher Self",
    description: "Stay updated with important reminders and insights from your Higher Self.",
    ogType: "website",
  },
  "/onboarding": {
    title: "Get Started — Higher Self",
    description:
      "Set up your Higher Self profile and begin your personal growth journey. Answer a few questions to personalize your experience.",
    ogType: "website",
  },
};

/**
 * Get metadata for a specific route
 * Falls back to default metadata if route not found
 */
export function getMetadataForRoute(pathname: string): PageMetadata {
  const metadata = ROUTE_METADATA[pathname];

  if (metadata) {
    return metadata;
  }

  // Default metadata for unknown routes
  return {
    title: "Higher Self — AI-Powered Personal Growth",
    description:
      "Track growth across 6 life domains with daily check-ins and AI insights.",
    ogType: "website",
  };
}

/**
 * Update document meta tags dynamically
 * Call this in useEffect when route changes
 */
export function updateMetaTags(metadata: PageMetadata, baseUrl: string = "https://higherself.cloud") {
  // Update title
  document.title = metadata.title;

  // Update or create description meta tag
  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement("meta");
    descriptionTag.setAttribute("name", "description");
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute("content", metadata.description);

  // Update Open Graph tags
  updateOGTag("og:title", metadata.title);
  updateOGTag("og:description", metadata.description);
  updateOGTag("og:type", metadata.ogType || "website");
  updateOGTag("og:url", baseUrl + window.location.pathname);

  if (metadata.ogImage) {
    updateOGTag("og:image", metadata.ogImage);
  }

  // Update Twitter Card tags (for better Twitter sharing)
  updateOGTag("twitter:title", metadata.title);
  updateOGTag("twitter:description", metadata.description);
  if (metadata.ogImage) {
    updateOGTag("twitter:image", metadata.ogImage);
  }
}

/**
 * Helper to update or create OG meta tags
 */
function updateOGTag(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Hook-friendly function to set metadata for a page
 * Usage in component:
 * useEffect(() => {
 *   const metadata = getMetadataForRoute(pathname);
 *   updateMetaTags(metadata);
 * }, [pathname]);
 */
export function usePageMetadata(pathname: string, baseUrl?: string) {
  const metadata = getMetadataForRoute(pathname);
  updateMetaTags(metadata, baseUrl);
  return metadata;
}
