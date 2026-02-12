document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
     🔑 AHORA LA API KEY SE OBTIENE DE MOCKAPI (NO HARDcode)
  ===================================================== */
  const MOCKAPI_URL = "https://698def67aded595c253090f9.mockapi.io/api/v1/apiKey";
  let OPENAI_API_KEY = ""; // se llenará al cargar MockAPI
  let apiKeyPromise = null; // evita múltiples solicitudes
  /* ===================================================== */

  const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

  const WAKE_WORD = "alfa";
  const IDLE_MS = 10000;

  const ALLOWED_OUTPUTS = new Set([
    "avanzar",
    "retroceder",
    "detener",
    "vuelta derecha",
    "vuelta izquierda",
    "90° derecha",
    "90° izquierda",
    "360° derecha",
    "360° izquierda",
    "Orden no reconocida",
  ]);

  // UI (con null-safe)
  const modePill = document.getElementById("modePill");
  const transcriptEl = document.getElementById("transcript");
  const commandEl = document.getElementById("command");
  const substatusEl = document.getElementById("substatus");

  function safeText(el, text) {
    if (el) el.textContent = text;
  }

  function setMode(text, cls) {
    if (!modePill) return;
    modePill.textContent = text;
    modePill.className = `pill ${cls}`;
  }

  function setSubstatus(text) {
    safeText(substatusEl, text);
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  /* =====================================================
     ✅ CARGA DE API KEY DESDE MOCKAPI (1er registro)
     - Espera un array: [{ apikey: "...", id: "1" }, ...]
  ===================================================== */
  async function loadApiKeyFromMockAPI() {
    // Si ya hay una promesa en curso, reutilízala
    if (apiKeyPromise) return apiKeyPromise;

    apiKeyPromise = (async () => {
      try {
        setSubstatus("Cargando credenciales (MockAPI)…");

        const r = await fetch(MOCKAPI_URL, { method: "GET" });
        if (!r.ok) throw new Error(`MockAPI HTTP ${r.status}`);

        const data = await r.json();

        // MockAPI suele devolver un arreglo
        const first = Array.isArray(data) ? data[0] : data;

        const key = first?.apikey;
        if (!key || typeof key !== "string") {
          throw new Error("No se encontró 'apikey' en el primer registro.");
        }

        OPENAI_API_KEY = key.trim();
        setSubstatus("Listo. Escuchando órdenes…");
        return OPENAI_API_KEY;
      } catch (err) {
        setMode("Error", "pill-error");
        setSubstatus(`No pude cargar API Key desde MockAPI: ${err.message}`);
        OPENAI_API_KEY = "";
        return "";
      }
    })();

    return apiKeyPromise;
  }

  // Dispara la carga desde el inicio (sin detener el resto)
  loadApiKeyFromMockAPI();
  /* ===================================================== */

  // ✅ Mapeo local de sinónimos (sigue igual)
  function localMapCommand(t) {
    const s = normalize(t);

    // movimientos básicos
    if (/(^|\b)(adelante|avanza|avance|avanzar|go|enfrente|en frente|recto|derecho|sigue|continua|continúe)(\b|$)/.test(s)) return "avanzar";
    if (/(^|\b)(atrás|atras|retrocede|retroceder|para atrás|para atras|back|reversa)(\b|$)/.test(s)) return "retroceder";
    if (/(^|\b)(alto|detente|detener|stop|parar|para|frena)(\b|$)/.test(s)) return "detener";

    // vueltas
    if (/(^|\b)(derecha)(\b|$)/.test(s) && /(90|noventa)/.test(s)) return "90° derecha";
    if (/(^|\b)(izquierda)(\b|$)/.test(s) && /(90|noventa)/.test(s)) return "90° izquierda";
    if (/(^|\b)(derecha)(\b|$)/.test(s) && /(360|trescientos sesenta)/.test(s)) return "360° derecha";
    if (/(^|\b)(izquierda)(\b|$)/.test(s) && /(360|trescientos sesenta)/.test(s)) return "360° izquierda";

    if (/(^|\b)(vuelta|gira|girar|giro)(\b|$)/.test(s) && /derecha/.test(s)) return "vuelta derecha";
    if (/(^|\b)(vuelta|gira|girar|giro)(\b|$)/.test(s) && /izquierda/.test(s)) return "vuelta izquierda";

    return null; // no pudo
  }

  /* =========================
     SPEECH RECOGNITION
  ========================= */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMode("No compatible", "pill-error");
    setSubstatus("Tu navegador no soporta SpeechRecognition. Prueba en Chrome/Edge.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "es-MX";
  recognition.continuous = true;
  recognition.interimResults = false;

  let suspended = false;
  let idleTimer = null;

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      suspended = true;
      setMode("Suspendido", "pill-sleep");
      setSubstatus('Suspendido por inactividad. Di "Alpha" para despertar.');
      safeText(commandEl, "—");
    }, IDLE_MS);
  }

  function safeStart() {
    try { recognition.start(); } catch (_) {}
  }

  recognition.onstart = () => {
    setMode(suspended ? "Suspendido" : "Activo", suspended ? "pill-sleep" : "pill-active");
    setSubstatus(suspended ? 'Esperando "Alpha"...' : "Escuchando órdenes…");
    resetIdleTimer();
  };

  recognition.onerror = (e) => {
    setMode("Error", "pill-error");
    setSubstatus(`Error STT: ${e.error || "desconocido"}`);
  };

  recognition.onend = () => {
    safeStart();
  };

  recognition.onresult = async (event) => {
    const last = event.results[event.results.length - 1];
    const raw = last?.[0]?.transcript?.trim() || "";
    if (!raw) return;

    safeText(transcriptEl, raw);
    resetIdleTimer();

    const lower = normalize(raw);

    // suspendido: solo wake word
    if (suspended) {
      if (lower.includes(WAKE_WORD)) {
        suspended = false;
        setMode("Activo", "pill-active");
        setSubstatus("Despierto. Escuchando órdenes…");
        resetIdleTimer();
      } else {
        setSubstatus('Suspendido. Di "Alpha" para despertar.');
      }
      return;
    }

    // activo: si dice wake word, ignora
    if (lower.includes(WAKE_WORD)) {
      setSubstatus("Wake word detectada (activo).");
      return;
    }

    // ✅ primero intenta mapeo local
    const localCmd = localMapCommand(lower);
    if (localCmd) {
      safeText(commandEl, localCmd);
      setSubstatus("Orden reconocida (local).");
      return;
    }

    // si no, usa OpenAI
    setSubstatus("Procesando con IA…");

    // Asegura que la key ya se intentó cargar (si no estaba lista)
    const key = OPENAI_API_KEY || (await loadApiKeyFromMockAPI());
    const cmd = await classifyWithOpenAI(raw, key);

    safeText(commandEl, cmd);
    setSubstatus(cmd === "Orden no reconocida" ? "No se reconoció una orden válida." : "Orden reconocida.");
  };

  setMode("Activo", "pill-active");
  setSubstatus("Pide permisos del micrófono. Escuchando órdenes…");
  safeStart();

  /* =========================
     OpenAI: Clasificador
  ========================= */
  async function classifyWithOpenAI(text, apiKey) {
    if (!apiKey) {
      setMode("Sin API Key", "pill-error");
      setSubstatus("No hay API Key disponible (MockAPI falló o no respondió).");
      return "Orden no reconocida";
    }

    const system = `
Eres un clasificador de comandos de voz.
Responde ÚNICAMENTE con EXACTAMENTE una de estas opciones (una sola línea):
avanzar
retroceder
detener
vuelta derecha
vuelta izquierda
90° derecha
90° izquierda
360° derecha
360° izquierda
Orden no reconocida

No agregues explicaciones, comillas, ni texto extra.
`.trim();

    try {
      const r = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: system },
            { role: "user", content: text }
          ],
          temperature: 0
        })
      });

      if (!r.ok) return "Orden no reconocida";

      const data = await r.json();
      const out =
        data?.output_text ||
        data?.output?.[0]?.content?.map(c => c?.text).filter(Boolean).join("") ||
        "";

      const result = String(out).trim();
      return ALLOWED_OUTPUTS.has(result) ? result : "Orden no reconocida";
    } catch {
      return "Orden no reconocida";
    }
  }
});
