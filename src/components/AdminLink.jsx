import { Lock } from "lucide-react";

export default function AdminLink({ onClick }) {
  return (
    <button type="button" className="rdfd-admin-link" onClick={onClick}>
      <Lock size={12} /> Admin access
    </button>
  );
}
