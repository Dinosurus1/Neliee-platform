// src/components/ui/Badge.jsx
const variants = {
  cyan:   "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  green:  "bg-green-500/10 text-green-400 border border-green-500/20",
  gray:   "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  red:    "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function Badge({ children, variant = "cyan" }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}