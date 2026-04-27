/**
 * Structured Data (JSON-LD) utility for schema.org markup
 * Helps search engines understand site structure and improves rich snippet eligibility
 */

export interface OrganizationSchema {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  logo: string;
  sameAs: string[];
  contactPoint: {
    "@type": string;
    contactType: string;
    url: string;
  };
}

export interface WebApplicationSchema {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  offers: {
    "@type": string;
    price: string;
    priceCurrency: string;
  };
  author: {
    "@type": string;
    name: string;
  };
}

/**
 * Generate Organization schema.org structured data
 */
export function getOrganizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Higher Self",
    description:
      "Your AI Mirror — a personalized guide to emotional maturity, inner peace, and authentic living through daily growth and reflection.",
    url: "https://higherself.cloud",
    logo: "https://higherself.cloud/logo.png",
    sameAs: [
      "https://twitter.com/higherself",
      "https://linkedin.com/company/higherself",
      "https://instagram.com/higherself",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      url: "https://higherself.cloud/settings",
    },
  };
}

/**
 * Generate WebApplication schema.org structured data
 */
export function getWebApplicationSchema(): WebApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Higher Self",
    description:
      "Transform your life with daily check-ins, AI insights, and personalized guidance across 6 life domains: Mindset, Relationships, Work, Health, Spirituality, and Finances.",
    url: "https://higherself.cloud",
    applicationCategory: "LifestyleApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Higher Self",
    },
  };
}

/**
 * Inject structured data into the document head
 */
export function injectStructuredData() {
  // Remove any existing structured data scripts
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    script.remove();
  });

  // Inject Organization schema
  const orgScript = document.createElement("script");
  orgScript.type = "application/ld+json";
  orgScript.textContent = JSON.stringify(getOrganizationSchema());
  document.head.appendChild(orgScript);

  // Inject WebApplication schema
  const appScript = document.createElement("script");
  appScript.type = "application/ld+json";
  appScript.textContent = JSON.stringify(getWebApplicationSchema());
  document.head.appendChild(appScript);
}

/**
 * Get structured data as JSON string (for SSR or pre-rendering)
 */
export function getStructuredDataJSON(): string {
  return JSON.stringify([getOrganizationSchema(), getWebApplicationSchema()]);
}
