import { ClassicFooter } from "./ClassicFooter";
import { ClassicHeader } from "./ClassicHeader";
import { ClassicHome } from "./ClassicHome";
import { ClassicNotFound } from "./ClassicNotFound";
import type { SiteLayoutModule } from "../types";

export { ClassicFooter, ClassicHeader, ClassicHome, ClassicNotFound };

export const classicLayout: SiteLayoutModule = {
  id: "classic",
  Header: ClassicHeader,
  Footer: ClassicFooter,
  Home: ClassicHome,
  NotFound: ClassicNotFound,
};
