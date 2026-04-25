// src/components/ui/Button.jsx
import Spinner from "./Spinner";

export default function Button({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  ...props
}) {
  const base = variant === "primary" ? "btn-primary" : "btn-outline";
  return (
    <button className={`${base} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Spinner size="sm" /> : children}
    </button>
  );
}