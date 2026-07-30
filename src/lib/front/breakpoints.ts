/** Canonical breakpoints — keep in sync with app/globals.css */
export const BP_MD = 768;
export const BP_LG = 1024;
export const BP_MD_MAX = BP_MD - 0.02;

export const mediaQueryMd = `(min-width: ${BP_MD}px)`;
export const mediaQueryBelowMd = `(max-width: ${BP_MD_MAX}px)`;
