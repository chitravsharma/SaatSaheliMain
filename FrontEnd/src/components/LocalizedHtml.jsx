import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../LanguageContext";
import { translateToHindi, hasDevanagari } from "../utils/translate";

/**
 * Renders rich (HTML) text that is automatically shown in Hindi when the
 * current app language is "hi".
 *
 * Resolution order when language === "hi":
 *   1. `hi` prop (editor-supplied Hindi translation)
 *   2. If `en` already contains Devanagari, use it as-is
 *   3. Auto-translate `en` via the MyMemory API (cached in localStorage)
 *
 * When language !== "hi" the `en` prop is rendered verbatim.
 */
const LocalizedHtml = ({ en = "", hi = "", as: Tag = "div", style, className }) => {
  const { language } = useLanguage();
  const [resolved, setResolved] = useState(() => {
    if (language === "hi") return hi || en;
    return en;
  });
  const reqId = useRef(0);

  useEffect(() => {
    const myReq = ++reqId.current;
    if (language !== "hi") {
      setResolved(en);
      return;
    }
    if (hi && hi.trim()) {
      setResolved(hi);
      return;
    }
    if (!en || hasDevanagari(en)) {
      setResolved(en);
      return;
    }
    // Show the English source until the async translation resolves so the
    // user is never looking at an empty block.
    setResolved(en);
    translateToHindi(en).then((translated) => {
      if (reqId.current === myReq) setResolved(translated);
    });
  }, [language, en, hi]);

  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: resolved || "" }}
    />
  );
};

export default LocalizedHtml;
