export const pay = async (phone) => {
  const res = await fetch("http://127.0.0.1:5000/pay", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ phone })
  });
  return res.json();
};

export const watch = async (token) => {
  const res = await fetch("http://127.0.0.1:5000/watch", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ token })
  });
  return res.json();
};
