import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  ogImage?: string;
  jsonLd?: object | string;
}

const SITE_NAME = "Trygg Hand";
const BASE_URL = "https://www.trygghand.com";

export default function Seo({ title, description, canonical, robots, ogImage, jsonLd }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? canonical : BASE_URL;

  return (
    <Helmet>
      {/* Grundläggande SEO */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {robots && <meta name="robots" content={robots} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph – Facebook, Messenger, WhatsApp */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="sv_SE" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* JSON-LD strukturerad data */}
      {jsonLd && (
        <script type="application/ld+json">
          {typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
