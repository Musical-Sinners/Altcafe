import "./Button.css";

/**
 * Shared button primitive.
 * variant: "primary" | "secondary" | "ghost" | "danger"
 * size:    "md" (52px) | "sm" (40px)
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${loading ? "btn-loading" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon size={18} strokeWidth={2.2} />}
          <span>{children}</span>
          {Icon && iconPosition === "right" && <Icon size={18} strokeWidth={2.2} />}
        </>
      )}
    </button>
  );
}

export default Button;