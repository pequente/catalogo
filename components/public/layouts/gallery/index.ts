import { GalleryFooter } from "./GalleryFooter";
import { GalleryHeader } from "./GalleryHeader";
import { GalleryHome } from "./GalleryHome";
import { GalleryNotFound } from "./GalleryNotFound";
import type { SiteLayoutModule } from "../types";

export { GalleryCarousel } from "./GalleryCarousel";
export { GalleryFooter, GalleryHeader, GalleryHome, GalleryNotFound };

export const galleryLayout: SiteLayoutModule = {
  id: "gallery",
  Header: GalleryHeader,
  Footer: GalleryFooter,
  Home: GalleryHome,
  NotFound: GalleryNotFound,
};
