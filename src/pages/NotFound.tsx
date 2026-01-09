import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f4f4", // soft grey
        padding: "2rem",
      }}
    >
      <section
        style={{
          maxWidth: "640px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "3rem 2.5rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "0.5rem",
            color: "#1f2933",
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1rem",
            color: "#374151",
          }}
        >
          Sidan kunde inte hittas
        </h2>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "#4b5563",
            marginBottom: "2rem",
          }}
        >
          Sidan du söker finns inte – eller har flyttats.
          <br />
          Men du är i trygga händer.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              backgroundColor: "#0f766e",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Till startsidan
          </Link>

          <Link
            to="/kontakt"
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              backgroundColor: "#e5e7eb",
              color: "#1f2933",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Kontakta oss
          </Link>
        </div>

        <p
          style={{
            marginTop: "2.5rem",
            fontSize: "0.9rem",
            color: "#6b7280",
          }}
        >
          Trygg Hand – från beslut till nytt kapitel
        </p>
      </section>
    </main>
  );
}
