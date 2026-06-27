import { useEffect, useState } from "react";

type Locale = "zh" | "en";

export default function LanguageToggle() {
  const [locale, setLocale] = useState<Locale>("zh");

  useEffect(() => {
    const stored = window.localStorage.getItem("fde-locale") as Locale | null;
    const next = stored === "en" ? "en" : "zh";
    setLocale(next);
    document.documentElement.dataset.locale = next;
  }, []);

  const selectLocale = (next: Locale) => {
    setLocale(next);
    document.documentElement.dataset.locale = next;
    window.localStorage.setItem("fde-locale", next);
  };

  return (
    <div className="locale-toggle" aria-label="Language switcher">
      <button type="button" className={locale === "zh" ? "active" : ""} onClick={() => selectLocale("zh")}>
        中文
      </button>
      <button type="button" className={locale === "en" ? "active" : ""} onClick={() => selectLocale("en")}>
        EN
      </button>
    </div>
  );
}
