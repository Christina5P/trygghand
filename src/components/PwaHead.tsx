import { Helmet } from "react-helmet-async";

export default function PwaHead() {
  // In Codespaces/preview URLs, the port is often private and requests for
  // manifest/service worker can trigger github.dev/pf-signin redirects.
  // Inject the manifest only in production builds.
  if (!import.meta.env.PROD) return null;

  return (
    <Helmet>
      <link rel="manifest" href="/manifest.json" />
    </Helmet>
  );
}
