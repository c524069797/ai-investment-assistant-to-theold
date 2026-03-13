export default function Loading() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid #dbeafe",
          borderTopColor: "#2563eb",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ color: "#64748b", fontSize: 14 }}>页面加载中，请稍候...</div>
    </div>
  );
}
