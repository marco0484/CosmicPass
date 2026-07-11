const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://www.cosmicpass.space";

const form = document.getElementById("loginForm");
const btn = document.getElementById("loginButton");
const msg = document.getElementById("loginMessage");
const pass = document.getElementById("passwordInput");
const toggle = document.getElementById("togglePassword");

toggle.addEventListener("click", () => {
  const visible = pass.type === "text";
  pass.type = visible ? "password" : "text";
  toggle.textContent = visible ? "Ver" : "Ocultar";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = form.user.value.trim();
  const password = form.password.value.trim();

  msg.textContent = "";
  msg.classList.remove("ok");
  form.classList.remove("shake");

  if (!user || !password) {
    showError("Completa usuario y contraseña.");
    return;
  }

  setLoading(true);

  try {

    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user,
        password
      })
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || "Credenciales incorrectas");
    }

    localStorage.setItem("auth", "true");
    localStorage.setItem(
      "cosmic_user",
      JSON.stringify(result.user)
    );

    msg.textContent = "Acceso concedido. Entrando al panel...";
    msg.classList.add("ok");

setTimeout(() => {
  const rol = String(result.user.rol || "").toLowerCase();

  window.location.href =
    rol === "owner"
      ? "admin.html"
      : "productora-admin.html";
}, 450);

  } catch (error) {

    showError(
      error.message || "Usuario o contraseña incorrectos."
    );

    setLoading(false);

  }

});

function setLoading(state) {
  btn.disabled = state;
  btn.querySelector("span").textContent =
    state
      ? "Validando acceso..."
      : "Entrar al panel";
}

function showError(text) {
  msg.textContent = text;
  msg.classList.remove("ok");

  form.classList.remove("shake");
  void form.offsetWidth;
  form.classList.add("shake");
}