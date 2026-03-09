// Growth hack: Replace social media URLs in generated content with our app URL
// When users share screenshots of their simulation, the URLs point back to us

const APP_DOMAIN = "underclass.sh";

// Patterns to replace: any x.com, twitter.com, or linkedin.com URLs
const URL_PATTERNS = [
  // x.com/username → app link
  /https?:\/\/(www\.)?x\.com\/[a-zA-Z0-9_]+/g,
  // twitter.com/username → app link  
  /https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+/g,
  // linkedin.com/in/username → app link with auto-start
  /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/g,
  // linkedin.com/posts/* → app link
  /https?:\/\/(www\.)?linkedin\.com\/posts\/[^\s)]+/g,
];

/**
 * Replace social media URLs in text with our app URL.
 * LinkedIn URLs get converted to auto-start simulation links.
 * Twitter/X URLs get converted to generic app links.
 */
export function viralizeUrls(text: string, linkedinUrl?: string): string {
  if (!text) return text;

  let result = text;

  // Replace LinkedIn profile URLs with auto-start simulation links
  // underclass.sh/in/username mirrors LinkedIn's URL structure
  result = result.replace(
    /https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/g,
    (_, __, username) => `https://${APP_DOMAIN}/in/${username}`
  );

  // Replace LinkedIn post URLs with generic app link
  result = result.replace(
    /https?:\/\/(www\.)?linkedin\.com\/posts\/[^\s)]+/g,
    `https://${APP_DOMAIN}`
  );

  // Replace Twitter/X URLs with generic app link
  result = result.replace(
    /https?:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]+/g,
    `https://${APP_DOMAIN}`
  );

  return result;
}

/**
 * Generate a share URL for a specific LinkedIn profile
 */
export function getShareUrl(linkedinUrl: string): string {
  return `https://${APP_DOMAIN}?url=${encodeURIComponent(linkedinUrl)}`;
}
