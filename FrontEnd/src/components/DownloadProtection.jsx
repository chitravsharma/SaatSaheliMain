import React, { useEffect } from "react";
import { useAuth } from "../AuthContext";

/**
 * Wraps children with download-protection CSS + right-click prevention.
 * SUPER_ADMIN users bypass all restrictions.
 */
export default function DownloadProtection({ children }) {
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (isSuperAdmin) return;

    const block = (e) => {
      const tag = e.target.tagName;
      if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, [isSuperAdmin]);

  if (isSuperAdmin) return <>{children}</>;

  return <div className="download-protected">{children}</div>;
}
