import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Reset scroll to top on route change so footer/header link clicks land at the
// top of the destination page. Skip when:
//   - the URL has a hash anchor (let the browser jump to the anchor)
//   - the navigation type is POP (back/forward — preserve previous scroll)
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) return;
    if (navType === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navType]);

  return null;
}
