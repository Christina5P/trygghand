import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SignedStorageImageProps = {
  bucket: string;
  path?: string | null;
  alt: string;
  className?: string;
  expiresIn?: number;
};

const isDirectUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");

export default function SignedStorageImage({
  bucket,
  path,
  alt,
  className,
  expiresIn = 600,
}: SignedStorageImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!path) {
        setSignedUrl(null);
        return;
      }
      if (isDirectUrl(path)) {
        setSignedUrl(path);
        return;
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setSignedUrl(null);
        return;
      }
      setSignedUrl(data.signedUrl);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [bucket, path, expiresIn]);

  if (!signedUrl) return null;

  return <img src={signedUrl} alt={alt} className={className} />;
}
