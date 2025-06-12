import { useEffect, useState } from "react";

export function useAgentGraph(agentId) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) {
      setImageUrl(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    fetch("/api/agent/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load graph image");
        }
        const blob = await res.blob();
        setImageUrl(URL.createObjectURL(blob));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [agentId]);

  return { imageUrl, loading, error };
}
