import { useEffect, useState } from "react";

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

export type { Review };

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/reviews.json") // tillfälligt tills vi lägger API
      .then((res) => res.json())
      .then(setReviews);
  }, []);

  return (
    <div className="space-y-4">
      {reviews.map((r, i) => (
        <div key={i} className="p-4 border rounded shadow-sm bg-white">
          <div className="flex justify-between">
            <h3 className="font-bold">{r.author_name}</h3>
            <div>⭐ {r.rating}</div>
          </div>
          <p className="text-sm text-gray-500">{r.relative_time_description}</p>
          <p className="mt-2">{r.text}</p>
        </div>
      ))}
    </div>
  );
}
