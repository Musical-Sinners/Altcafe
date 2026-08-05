import "./Skeleton.css";

function Skeleton({ width = "100%", height = "16px", radius = "8px", className = "" }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export default Skeleton;