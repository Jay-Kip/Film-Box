import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import "../styles/home.css";

function Home() {
  const [rating, setRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const [showTrailer, setShowTrailer] = useState(false);
  const [hasTicket, setHasTicket] = useState(false); // ✅ track if user already has ticket

  // 💰 Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);

  const videoRef = useRef(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);

  // -----------------------------------
  // 💰 BUY TICKET (REAL MPESA)
  // -----------------------------------
  const handlePayment = async () => {
    if (!phone) {
      alert("Please enter your M-Pesa number");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
        }),
      });

      const data = await res.json();
      console.log("PAYMENT RESPONSE:", data);

      if (data.success) {
        alert("📲 Check your phone and enter your M-Pesa PIN");

        localStorage.setItem("checkout_id", data.checkout_id);

        setShowPaymentModal(false);
        setPhone("");

        startPaymentVerification(data.checkout_id);
      } else {
        alert(data.error || "Payment failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Is the backend running?");
    }
  };

  // -----------------------------------
  // 🔁 CHECK PAYMENT STATUS
  // -----------------------------------
  const startPaymentVerification = (checkoutId) => {
    setCheckingPayment(true);

    // Stop polling after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      timeoutRef.current = null;
      setCheckingPayment(false);
      alert("⏱ Payment confirmation timed out. If you were charged, please contact support.");
    }, 120000);

    timeoutRef.current = timeout;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/check-payment-status?checkout_id=${checkoutId}`
        );

        const data = await res.json();
        console.log("PAYMENT STATUS:", data);

        if (data.status === "paid") {
          clearInterval(interval);
          clearTimeout(timeoutRef.current);
          pollingRef.current = null;
          timeoutRef.current = null;
          setCheckingPayment(false);

          localStorage.setItem("token", data.token);
          setHasTicket(true); // ✅ switch button immediately after payment
          alert("✅ Payment successful!");
          window.location.href = "/countdown";
        }

        if (data.status === "failed") {
          clearInterval(interval);
          clearTimeout(timeoutRef.current);
          pollingRef.current = null;
          timeoutRef.current = null;
          setCheckingPayment(false);

          alert("❌ Payment failed or cancelled");
        }
      } catch (err) {
        console.error(err);
      }
    }, 5000);

    pollingRef.current = interval;
  };

  // ✅ Clear polling and timeout if user navigates away
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // -----------------------------------
  // ⭐ SUBMIT RATING
  // -----------------------------------
  const submitRating = async (value) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("🎟 Buy a ticket first to rate");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: value,
          token: token,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      localStorage.setItem("user_rating", value);

      setRating(value);
      loadRatings();
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------
  // 📊 LOAD RATINGS
  // -----------------------------------
  const loadRatings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ratings`);
      const data = await res.json();

      setAvgRating(data.avg || 0);
      setRatingCount(data.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------------
  // 🔄 LOAD SAVED RATING + CHECK TICKET
  // -----------------------------------
  useEffect(() => {
    const savedRating = localStorage.getItem("user_rating");
    if (savedRating) setRating(parseInt(savedRating));

    // ✅ check if user already has a ticket from a previous session
    const token = localStorage.getItem("token");
    if (token) setHasTicket(true);

    loadRatings();
  }, []);

  const displayRating = rating || Math.round(avgRating);

  // -----------------------------------
  // 🎬 HLS TRAILER PLAYER
  // -----------------------------------
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
            After he receives the news, Russell isolates himself
            to grieve and vows to get revenge for the death of
            his brother.
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
                  className={`star ${
                    star <= displayRating ? "active" : ""
                  }`}
                  onClick={() => submitRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="buttons">
          <button
            className="btn trailer"
            onClick={() => setShowTrailer(true)}
          >
            ▶ Watch Trailer
          </button>

          {/* ✅ Show Watch Movie if ticket exists, Buy Ticket if not */}
          {hasTicket ? (
            <button
              className="btn buy"
              onClick={() => window.location.href = "/countdown"}
            >
              🎬 Watch Movie
            </button>
          ) : (
            <button
              className="btn buy"
              onClick={() => setShowPaymentModal(true)}
            >
              🎟 Buy Ticket
            </button>
          )}
        </div>

        {checkingPayment && (
          <p style={{ marginTop: "20px" }}>
            ⏳ Waiting for payment confirmation...
          </p>
        )}
      </div>

      {/* 🎬 TRAILER MODAL */}
      {showTrailer && (
        <div
          className="modal"
          onClick={() => setShowTrailer(false)}
        >
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

            <video
              ref={videoRef}
              controls
              autoPlay
              width="100%"
            />
          </div>
        </div>
      )}

      {/* 💰 PAYMENT MODAL */}
      {showPaymentModal && (
        <div
          className="modal"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="modal-content payment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="close"
              onClick={() => setShowPaymentModal(false)}
            >
              ✖
            </span>

            <h2>Enter M-Pesa Number</h2>

            <input
              type="text"
              placeholder="2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="phone-input"
            />

            <button
              className="btn buy"
              onClick={handlePayment}
            >
              Pay KES 100
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
