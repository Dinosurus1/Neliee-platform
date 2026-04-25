// src/components/ui/Input.jsx
export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <input className={`input ${error ? "border-red-500 focus:ring-red-500/30" : ""} ${className}`} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}