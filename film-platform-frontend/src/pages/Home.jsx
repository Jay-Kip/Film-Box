import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import "../styles/home.css";

function Home() {
  const [rating, setRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);

  const videoRef = useRef(null);

  // 🎯 BUY TICKET
  const handlePayment = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: "254712345678" }),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        alert("✅ Ticket purchased!");
        window.location.href = "/countdown";
      } else {
        alert("Payment failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ⭐ SUBMIT RATING (FIXED)
  const submitRating = async (value) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("🎟 Buy a ticket first to rate");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: value,
          token: token, // ✅ REQUIRED
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // ✅ Save locally so stars stay lit
      localStorage.setItem("user_rating", value);

      setRating(value);

      // 🔄 reload average
      loadRatings();
    } catch (err) {
      console.error(err);
    }
  };

const displayRating = rating || Math.round(avgRating);

  // 📊 LOAD RATINGS (FIXED)
  const loadRatings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/ratings");
      const data = await res.json();

      setAvgRating(data.avg || 0);
      setRatingCount(data.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔄 LOAD USER RATING (IMPORTANT)
  useEffect(() => {
    const savedRating = localStorage.getItem("user_rating");
    if (savedRating) {
      setRating(parseInt(savedRating));
    }

    loadRatings();
  }, []);

  // 🎬 HLS PLAYER
  useEffect(() => {
    if (showTrailer && videoRef.current) {
      const video = videoRef.current;
      const src =
        "https://russellmisarable.s3.eu-north-1.amazonaws.com/index.m3u8";

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);

        return () => hls.destroy();
      }
    }
  }, [showTrailer]);

  return (
    <div className="hero">
      {/* BACKGROUND */}
      <div className="hero-bg"></div>

      {/* CONTENT */}
      <div className="hero-content">
        <div className="top-section">
          <div className="title-container">
            <h1 className="title">RUSSELL</h1>
            <h3 className="sub-title">Lé Misérable (2026)</h3>
          </div>

          <p className="description">
            After he recieves the news, Russell isolates himself
            to greif and vows to get revange for the death of his brother.
          </p>

          {/* ⭐ RATINGS */}
          <div className="ratings">
            <span className="avg-rating">
              ⭐ {avgRating} / 5 ({ratingCount} ratings)
            </span>

            <div className="user-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= displayRating ? "active" : ""}`}
                    onClick={() => {
                      setRating(star);
                      submitRating(star);
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>


          </div>
        </div>

        {/* 🎯 BUTTONS */}
        <div className="buttons">
          <button
            className="btn trailer"
            onClick={() => setShowTrailer(true)}
          >
            ▶ Watch Trailer
          </button>

          <button className="btn buy" onClick={handlePayment}>
            🎟 Buy Ticket
          </button>
        </div>
      </div>

      {/* 🎬 TRAILER MODAL */}
      {showTrailer && (
        <div className="modal" onClick={() => setShowTrailer(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="close"
              onClick={() => setShowTrailer(false)}
            >
              ✖
            </span>

            <video ref={videoRef} controls autoPlay width="100%" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
