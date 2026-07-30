import { SplitFooter } from "./SplitFooter";
import { SplitHeader } from "./SplitHeader";
import { SplitHome } from "./SplitHome";
import { SplitNotFound } from "./SplitNotFound";
import type { SiteLayoutModule } from "../types";

export { SplitFooter, SplitHeader, SplitHome, SplitNotFound };

export const splitLayout: SiteLayoutModule = {
  id: "split",
  Header: SplitHeader,
  Footer: SplitFooter,
  Home: SplitHome,
  NotFound: SplitNotFound,
};
