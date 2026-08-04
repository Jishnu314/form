import { useState } from "react";

export function useAdminGate(adminPin) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");

  function openGate() {
    setPinValue("");
    setPinError("");
    setPinModalOpen(true);
  }

  function closeGate() {
    setPinModalOpen(false);
  }

  function checkPin() {
    if (pinValue === adminPin) {
      setIsAdmin(true);
      setPinModalOpen(false);
      setPinValue("");
      setPinError("");
    } else {
      setPinError("Incorrect PIN");
    }
  }

  function lock() {
    setIsAdmin(false);
  }

  return {
    isAdmin,
    pinModalOpen,
    pinValue,
    pinError,
    setPinValue,
    setPinError,
    openGate,
    closeGate,
    checkPin,
    lock,
  };
}
