import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

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

export default function Seo({
  title,
  description,
  canonical,
  robots,
  ogImage,
  jsonLd,
}: SeoProps) {
  const { pathname } = useLocation();

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ?? `${BASE_URL}${pathname}`;

  const isHandplockat =
    pathname.startsWith("/handplockat") ||
    pathname.startsWith("/portal/handplockat") ||
    pathname.startsWith("/admin/handplockat");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {robots && <meta name="robots" content={robots} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* ✅ Byt favicon baserat på route (inte canonical) */}
      {isHandplockat ? (
        <>
          <link rel="icon" type="image/png" sizes="32x32" href="/handplockat-favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/handplockat-favicon-16x16.png" />
          <link rel="shortcut icon" href="/handplockat-favicon-32x32.png" />
          <link rel="apple-touch-icon" sizes="192x192" href="/handplockat-favicon-192x192.png" />
        </>
      ) : (
        <>
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="shortcut icon" href="/favicon-32x32.png" />
          <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192x192.png" />
        </>
      )}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="sv_SE" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {jsonLd && (
        <script type="application/ld+json">
          {typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}