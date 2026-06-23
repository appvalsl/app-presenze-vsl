console.log("JS CARICATO");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM CARICATO");

  const btn = document.getElementById("loginBtn");

  if (!btn) {
    console.error("Bottone non trovato");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("CLICK OK");

    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    console.log(email, password);
  });
});
