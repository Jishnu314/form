export default function Toast({ message }) {
  if (!message) return null;
  return <div className="rdfd-toast">{message}</div>;
}
