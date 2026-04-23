import { useEffect, useState } from "react";

function Countdown() {
  const [timeLeft, setTimeLeft] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const token = localStorage.getItem("token");

  // 🎬 FETCH VIDEO STATUS
  const fetchVideo = async () => {
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/get-video?token=${token}`
      );

      const data = await res.json();

      if (data.status === "unlocked") {
        setVideoUrl(data.video_url);
      } else if (data.status === "locked") {
        startCountdown(new Date(data.release_date));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ⏳ COUNTDOWN
  const startCountdown = (releaseDate) => {
    const interval = setInterval(() => {
      const diff = new Date(releaseDate) - new Date();

      if (diff <= 0) {
        clearInterval(interval);
        fetchVideo(); // 🔥 auto unlock
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    fetchVideo();
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
          <h1 style={{ marginBottom: "10px" }}>Ticket Confirmed ✔</h1>
          <p style={{ marginBottom: "10px", opacity: 0.7 }}>
            Full Movie out in:
          </p>

          <h2
            style={{
              fontSize: "50px",
              letterSpacing: "2px",
              marginTop: "10px",
            }}
          >
            {timeLeft}
          </h2>
        </>
      )}

      {/* 🎬 AFTER RELEASE */}
      {videoUrl && (
        <>
          <h2 style={{ marginBottom: "20px" }}>🎬 Now Playing</h2>

          <video width="80%" controls>
            <source src={videoUrl} type="application/x-mpegURL" />
          </video>
        </>
      )}
    </div>
  );
}

export default Countdown;
