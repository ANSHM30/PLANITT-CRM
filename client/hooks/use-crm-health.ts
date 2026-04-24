import { useEffect, useState } from "react";

type HealthResponse = {
  message: string;
  timestamp: string;
};

export function useCrmHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/health`
        );
        const json = (await response.json()) as HealthResponse;
        setData(json);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return { data, loading };
}
