document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = e.target.querySelectorAll("input");

  const res = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user: inputs[0].value,
      password: inputs[1].value
    })
  });

  if (res.ok) {
    localStorage.setItem("auth", "true");
    window.location.href = "admin.html";
  } else {
    alert("Credenciales incorrectas");
  }
});