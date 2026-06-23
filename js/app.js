console.log("APP AVVIATA");

const app = {
  supabase: null,

  init() {
    console.log("INIT");

    if (!window.APP_CONFIG) {
      console.error("Config non trovata");
      return;
    }

    this.supabase = window.supabase.createClient(
      window.APP_CONFIG.SUPABASE_URL,
      window.APP_CONFIG.SUPABASE_ANON_KEY
    );

    this.bindEvents();
  },

  bindEvents() {
    const btn = document.getElementById("loginBtn");

    if (!btn) {
      console.error("Login button non trovato");
      return;
    }

    btn.addEventListener("click", () => this.handleLogin());
  },

  async handleLogin() {
    console.log("LOGIN CLICK");

    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (!email || !password) {
      alert("Inserisci email e password");
      return;
    }

    const btn = document.getElementById("loginBtn");
    btn.disabled = true;
    btn.innerText = "Accesso...";

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error(error);
        alert("Errore login: " + error.message);
        return;
      }

      console.log("LOGIN OK:", data);
      alert("Login riuscito ✅");

      // ✅ qui potrai poi mostrare app vera
      this.showApp();

    } catch (err) {
      console.error(err);
      alert("Errore imprevisto");
    } finally {
      btn.disabled = false;
      btn.innerText = "Accedi";
    }
  },

  showApp() {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM CARICATO");
  app.init();
});
