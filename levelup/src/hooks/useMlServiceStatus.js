import { useEffect, useState } from "react";
import { getMlStatus } from "../services/mlApi";

export function useMlServiceStatus({ enabled = true } = {}) {
  const [status, setStatus] = useState({
    checked: false,
    online: false,
    serviceName: "",
    error: "",
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let active = true;

    async function loadStatus() {
      try {
        const response = await getMlStatus();
        if (!active) {
          return;
        }
        setStatus({
          checked: true,
          online: response?.ok !== false,
          serviceName: String(response?.service || "ML service"),
          error: "",
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus({
          checked: true,
          online: false,
          serviceName: "ML service",
          error: error?.message || "Could not reach the ML service.",
        });
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, [enabled]);

  return status;
}
