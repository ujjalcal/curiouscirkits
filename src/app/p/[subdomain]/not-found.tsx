import Link from "next/link";

export default function PortfolioNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: "#1d1d1f",
        backgroundColor: "#ffffff",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
          letterSpacing: "-0.02em",
        }}
      >
        Portfolio not found
      </h1>
      <p
        style={{
          fontSize: "1.125rem",
          color: "#86868b",
          marginBottom: "2rem",
          maxWidth: "28rem",
          lineHeight: 1.5,
        }}
      >
        The portfolio you are looking for does not exist or has been removed.
      </p>
      <Link
        href="https://curiouscirkits.com"
        style={{
          fontSize: "1rem",
          color: "#0071e3",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Go to curiouscirkits.com
      </Link>
    </div>
  );
}
