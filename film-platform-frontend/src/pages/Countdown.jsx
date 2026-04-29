import { useEffect, useState } from "react";

const RELEASE_DATE = new Date("2026-05-05T00:00:00");

function Countdown() {
  const [timeLeft, setTimeLeft] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const token = localStorage.getItem("token");

  // 🎬 FETCH VIDEO STATUS
  const fetchVideo = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/get-video?token=${token}`
      );

      const data = await res.json();

      if (data.status === "unlocked") {
        setVideoUrl(data.video_url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ⏳ COUNTDOWN LOGIC
  useEffect(() => {
    fetchVideo();

    const interval = setInterval(() => {
      const diff = RELEASE_DATE - new Date();

      if (diff <= 0) {
        clearInterval(interval);
        fetchVideo();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: "20px",
        width: "100%",
        boxSizing: "border-box",
        position: "absolute",
      }}
    >
      {/* 🔙 BACK BUTTON */}
      <button
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          padding: "10px 15px",
          cursor: "pointer",
          background: "#111",
          color: "white",
          border: "1px solid #333",
          borderRadius: "5px",
        }}
        onClick={() => (window.location.href = "/")}
      >
        ⬅ Back
      </button>

      {/* ⏳ BEFORE RELEASE */}
      {!videoUrl && (
        <>
          <h1 style={{ marginBottom: "10px" }}>Ticket Confirmed ✅</h1>

          <p style={{ marginBottom: "10px", marginTop: "20px", opacity: 0.7 }}>
            Full Movie releases in:
          </p>

          <h2
            style={{
              fontSize: "clamp(28px, 8vw, 50px)", // ✅ scales with screen
              letterSpacing: "2px",
              marginTop: "10px",
            }}
          >
            {timeLeft}
          </h2>

          <p style={{ opacity: 0.5, marginTop: "10px" }}>
            May 5, 2026 • 00:00 UTC
          </p>
        </>
      )}

      {/* 🎬 AFTER RELEASE */}
      {videoUrl && (
        <>
          <h2 style={{ marginBottom: "20px" }}>🎬 Now Playing</h2>

          <video
            controls
            autoPlay
            style={{
              width: "100%",           // ✅ full width on mobile
              maxWidth: "960px",       // ✅ capped on desktop
              aspectRatio: "16 / 9",  // ✅ always correct proportions
              background: "#000",
            }}
          >
            <source src={videoUrl} type="application/x-mpegURL" />
          </video>
        </>
      )}
    </div>
  );
}

export default Countdown;
