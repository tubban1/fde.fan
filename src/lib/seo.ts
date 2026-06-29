export const SITE_URL = "https://www.fde.fan";
export const SITE_NAME = "FDE FAN";
export const DEFAULT_IMAGE = `${SITE_URL}/assets/wechat-share.jpg`;

export const absoluteUrl = (path = "/") => new URL(path, SITE_URL).toString();

export const organizationJsonLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: ["FDE FAN Academy", "AI-FDE Academy"],
  url: SITE_URL,
  logo: absoluteUrl("/assets/fde-logo-mark.png"),
  sameAs: ["https://github.com/tubban1/fde.fan"],
};

export const websiteJsonLd = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ["FDE FAN Academy", "Forward Deployed Engineer Academy", "AI-FDE Academy"],
  url: SITE_URL,
  inLanguage: ["zh-CN", "en"],
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const webPageJsonLd = ({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) => ({
  "@type": "WebPage",
  "@id": `${absoluteUrl(path)}#webpage`,
  url: absoluteUrl(path),
  name: title,
  description,
  image,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: ["zh-CN", "en"],
});

export const breadcrumbJsonLd = (items: Array<{ name: string; path: string }>) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const courseJsonLd = ({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) => ({
  "@type": "Course",
  name,
  description,
  url: absoluteUrl(path),
  provider: { "@id": `${SITE_URL}/#organization` },
  inLanguage: ["zh-CN", "en"],
});

export const articleJsonLd = ({
  headline,
  description,
  path,
  image = DEFAULT_IMAGE,
  datePublished,
}: {
  headline: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
}) => ({
  "@type": "Article",
  headline,
  description,
  url: absoluteUrl(path),
  image,
  datePublished,
  dateModified: new Date().toISOString(),
  author: { "@id": `${SITE_URL}/#organization` },
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: ["zh-CN", "en"],
});

export const faqJsonLd = (items: Array<{ question: string; answer: string }>) => ({
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});
