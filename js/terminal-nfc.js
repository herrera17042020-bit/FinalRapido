/* ==========================================================================
   terminal-nfc.js — Terminal NFC (solo administrador).
   Muestra, dentro del panel, la MISMA página que ve el cliente al acercar su
   celular al chip NFC / QR del local (nfc.html), con herramientas extra:
     • navegar la vista del cliente (inicio, catálogo, extras, tarjeta)
     • consultar la tarjeta de cualquier cliente sin pedirle teléfono y placa
     • enlace y QR para el chip / Beacons
   El cliente NO puede entrar aquí: solo accede a nfc.html por el NFC o el QR.
   (Sin textos explicativos dentro de la terminal, a pedido del negocio.)
   ========================================================================== */
const TERMINAL_NFC = (() => {
  const e = s => APP.escapeHtml(s);
  let portal = null, montado = false;

  function render() {
    const root = document.getElementById("terminal-nfc-root");
    root.innerHTML = `<div class="nfc-term">
      <div class="nfc-term__tel">
        <div class="nfc-phone"><div class="nfc-phone__notch"></div><div class="nfc-phone__screen" id="nfc-portal"></div></div>
      </div>
      <aside class="nfc-term__tools">
        <div class="nfc-tool">
          <h3>📶 Vista del cliente</h3>
          <div class="nfc-nav">${[["inicio", "🏠 Inicio"], ["catalogo", "📋 Catálogo"], ["extras", "✨ Extras"], ["lealtad", "⭐ Tarjeta"]].map(([v, l]) => `<button class="btn btn--ghost btn--sm" data-nfc-ir="${v}">${l}</button>`).join("")}</div>
        </div>
        <div class="nfc-tool">
          <h3>🔎 Consultar la tarjeta de un cliente</h3>
          <input type="text" id="nfc-buscar" placeholder="Nombre, teléfono o placa..." autocomplete="off">
          <div id="nfc-resultados" class="nfc-res"></div>
        </div>
        <div class="nfc-tool">
          <h3>🔗 Enlace del chip NFC / QR</h3>
          <div class="nfc-url"><code id="nfc-url">${e(DEMO.configuracion.catalogo.urlPublica)}</code><button class="btn btn--ghost btn--sm" id="nfc-copiar">Copiar</button></div>
          <div class="nfc-acciones"><a class="btn btn--ghost btn--sm" href="nfc.html" target="_blank" rel="noopener">Abrir página pública ↗</a><button class="btn btn--primary btn--sm" data-nav-config>⚙️ Configurar catálogo</button></div>
        </div>
      </aside>
    </div>`;
    portal = PORTAL.montar(document.getElementById("nfc-portal"), { modo: "admin" });
  }

  function buscar(q) {
    const box = document.getElementById("nfc-resultados"); q = q.trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = ""; return; }
    const np = DEMO.calc.normPlaca, qp = np(q).toLowerCase(), qd = q.replace(/\D/g, "");
    const lista = DEMO.clientes.filter(c => c.nombre.toLowerCase().includes(q) || (qd.length >= 3 && c.telefono.replace(/\D/g, "").includes(qd))
      || c.vehiculos.some(v => np(v.placa).toLowerCase().includes(qp))).slice(0, 6);
    box.innerHTML = lista.map(c => `<button class="nfc-res__item" data-cli="${c.id}"><strong>${e(c.nombre)}</strong><small>${e(c.telefono)}${c.vehiculos.filter(v => v.placa).map(v => " · " + e(v.placa)).join("")}</small></button>`).join("")
      || '<div class="small text-muted" style="padding:6px">Sin resultados.</div>';
  }

  function enlazar() {
    if (montado) return; montado = true;
    const root = document.getElementById("terminal-nfc-root");
    root.addEventListener("click", async ev => {
      const ir = ev.target.closest("[data-nfc-ir]");
      if (ir) { if (ir.dataset.nfcIr === "lealtad") portal.salirCliente(); portal.ir(ir.dataset.nfcIr); return; }
      const cli = ev.target.closest("[data-cli]");
      if (cli) { const r = await portal.mostrarCliente(cli.dataset.cli); if (r && !r.ok) APP.toast("danger", "No se pudo abrir", r.error); return; }
      if (ev.target.closest("#nfc-copiar")) {
        const url = DEMO.configuracion.catalogo.urlPublica;
        try { await navigator.clipboard.writeText(url); APP.toast("success", "Enlace copiado", url); } catch { APP.toast("info", "Copiá el enlace", url); }
        return;
      }
      if (ev.target.closest("[data-nav-config]")) { APP.volverAlPanel(); APP.goTo("nfc-config"); }
    });
    root.addEventListener("input", ev => { if (ev.target.id === "nfc-buscar") buscar(ev.target.value); });
  }

  return {
    iniciar(params = {}) {
      render(); enlazar();
      portal.iniciar({ vista: "inicio" }).then(() => { if (params.clienteId) portal.mostrarCliente(params.clienteId); });
    },
    detener() { /* sin temporizadores */ },
  };
})();
