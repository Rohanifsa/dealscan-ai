export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        background: "#f5f5f5",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "16px" }}>
        DealScan AI
      </h1>

      <p style={{ fontSize: "20px", color: "#555" }}>
        Deployment working successfully.
      </p>
    </div>
  );
}