import { useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);

  function showToast(msg, duration = 2200) {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), duration);
  }

  return { toast, showToast };
}
