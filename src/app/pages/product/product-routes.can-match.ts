import { CanMatchFn, UrlSegment } from '@angular/router';

const PRODUCT_ENTRY_POINTS = new Set([
  'product',
  'all-cars',
  'brand',
  'category',
  'location',
  'cars-rental-dubai',
]);

/**
 * Prevents the entire product module from loading on routes
 * that do not need it (e.g. home page) to shave off JS parse time
 * and total blocking time. Only matches when the first segment after
 * the language prefix belongs to a product-related path.
 */
export const productRoutesCanMatch: CanMatchFn = (_route, segments: UrlSegment[]) => {
  if (!segments.length) {
    return false;
  }

  const firstSegment = segments[0]?.path?.toLowerCase();
  if (!firstSegment) {
    return false;
  }

  if (PRODUCT_ENTRY_POINTS.has(firstSegment)) {
    return true;
  }

  // legacy redirects such as brand/:slug or category/:slug (already handled above)
  // fall through to false for unrelated paths
  return false;
};
