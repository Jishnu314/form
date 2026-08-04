import { formatINR } from "../utils/format.js";

export default function GrandTotalBanner({ total }) {
  return (
    <div className="rdfd-grand-total">
      <span>Grand Total</span>
      <span>₹{formatINR(total)}</span>
    </div>
  );
}
