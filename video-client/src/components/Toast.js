import React from "react";

export default function Toast({ children, onClose, timeout = 3000 }) {
  React.useEffect(() => {
    if (!timeout) return;
    const id = setTimeout(() => onClose?.(), timeout);
    return () => clearTimeout(id);
  }, [onClose, timeout]);

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        background: "rgba(0,0,0,0.85)",
        color: "white",
        padding: "8px 12px",
        borderRadius: 6,
        zIndex: 9999,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </div>
  );
}
