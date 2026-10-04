/* ==========================================================================
   nfc-config.js — "Página NFC" (solo administrador).
   Configura lo que ve el cliente al acercar su celular al NFC / QR:
   enlace y QR, textos, redes sociales y qué servicios aparecen en el catálogo
   (con su lista "incluye", descripción y destacado). Los PRECIOS se toman de
   Servicios: aquí no se duplican.
   ========================================================================== */
(() => {
  const e = s => APP.escapeHtml(s);
  const money = n => APP.money(n);
  const $ = id => document.getElementById(id);
  const CDN_QR = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

  // QR del enlace (librería por CDN; si no hay internet se muestra un aviso).
  function dibujarQR(el, url) {
    const pintar = () => { el.innerHTML = ""; new QRCode(el, { text: url, width: 168, height: 168, colorDark: "#17110D", colorLight: "#ffffff" }); };
    if (window.QRCode) return pintar();
    el.innerHTML = '<span class="small text-muted">Generando QR…</span>';
    const sc = document.createElement("script"); sc.src = CDN_QR; sc.onload = pintar;
    sc.onerror = () => { el.innerHTML = '<span class="small text-muted">El QR necesita conexión a internet.</span>'; };
    document.head.appendChild(sc);
  }

  const resumenPrecio = s => {
    if (s.preciosVehiculo) { const v = Object.values(s.preciosVehiculo).filter(x => Number(x) > 0); return v.length ? `desde ${money(Math.min(...v))} · ${v.length} tipo(s)` : "Por definir"; }
    return Number(s.precioBase) > 0 ? money(s.precioBase) : "Por definir";
  };

  function filaServicio(s, tipo) {
    const c = DEMO.configuracion.catalogo.servicios[s.id] || {};
    const visible = c.visible !== false, incluye = (c.incluye || []).join("\n");
    return `<div class="nfcc-serv ${visible ? "" : "is-off"}" data-sid="${s.id}">
      <div class="nfcc-serv__head">
        <label class="nfcc-switch"><input type="checkbox" data-f="visible" ${visible ? "checked" : ""}><span></span></label>
        <div><strong>${e(s.nombre)}</strong><small>${resumenPrecio(s)}${s.estado !== "activo" ? " · inactivo en Servicios (no se muestra)" : ""}</small></div>
        ${tipo === "lavado" ? `<label class="checkbox-row nfcc-dest"><input type="checkbox" data-f="destacado" ${c.destacado ? "checked" : ""}> Recomendado</label>` : ""}
      </div>
      ${tipo === "lavado"
        ? `<label class="nfcc-campo">Incluye <small>(un punto por línea)</small><textarea rows="4" data-f="incluye" placeholder="Lavado exterior&#10;Aspirado…">${e(incluye)}</textarea></label>`
        : `<label class="nfcc-campo">Descripción para el cliente<input data-f="descripcion" maxlength="160" value="${e(c.descripcion != null && c.descripcion !== "" ? c.descripcion : s.descripcion || "")}"></label>`}
    </div>`;
  }

  function pintar() {
    if (APP.state.paginaActual !== "nfc-config") return;
    const c = DEMO.configuracion.catalogo, sv = DEMO.servicios;
    const grupo = (titulo, lista, tipo) => `<div class="card nfcc-grupo"><h4>${titulo}</h4>${lista.length ? lista.map(s => filaServicio(s, tipo)).join("") : '<div class="empty-mini">Sin servicios.</div>'}</div>`;
    $("nfc-config-root").innerHTML = `
      <div class="nfcc-top">
        <div class="card nfcc-enlace">
          <h4>🔗 Enlace del chip NFC y del QR</h4>
          <p class="small text-muted">Es la dirección que abre el celular del cliente. Grábala en el chip NFC, en el QR impreso o en el botón de Beacons. Al publicar el sistema en internet, cámbiala por la dirección real de <b>nfc.html</b>.<br>Agregando <b>?v=lealtad</b> al final, el enlace abre directo “Mi Tarjeta de Fidelidad” (útil para el botón de Beacons).</p>
          <div class="nfcc-url"><input id="nfcc-url" value="${e(c.urlPublica)}"><button class="btn btn--ghost btn--sm" id="nfcc-copiar">Copiar</button></div>
          <div class="nfcc-acciones"><button class="btn btn--primary btn--sm" id="nfcc-terminal">📶 Ver como cliente (Terminal NFC)</button><a class="btn btn--ghost btn--sm" href="nfc.html" target="_blank" rel="noopener">Abrir página pública ↗</a></div>
        </div>
        <div class="card nfcc-qr"><div id="nfcc-qr"></div><button class="btn btn--ghost btn--sm" id="nfcc-qr-bajar">Descargar QR</button></div>
      </div>
      <form id="nfcc-form" novalidate>
        <div class="grid-2">
          <div class="card"><h4>📝 Textos</h4><div class="form-grid">
            <label>Título<input name="titulo" maxlength="40" value="${e(c.titulo)}"></label>
            <label>Subtítulo<input name="subtitulo" maxlength="60" value="${e(c.subtitulo)}"></label></div>
            <label class="nfcc-campo">Texto de “Mi Tarjeta de Fidelidad”<textarea name="textoLealtad" rows="3" maxlength="220">${e(c.textoLealtad)}</textarea></label>
            <label class="checkbox-row"><input type="checkbox" name="mostrarPrecios" ${c.mostrarPrecios !== false ? "checked" : ""}> Mostrar precios en el catálogo</label>
          </div>
          <div class="card"><h4>📣 Redes y enlaces</h4><div class="form-grid">
            ${[["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["whatsapp", "WhatsApp"]].map(([k, l]) => `<label>${l}<input name="red-${k}" placeholder="https://… (vacío = no se muestra)" value="${e(c.redes[k] || "")}"></label>`).join("")}</div>
            <div class="form-grid" style="margin-top:8px">
              ${[["encuesta", "Encuesta"], ["waze", "Waze"]].map(([k, l]) => `<label>${l} <span class="small"><input type="checkbox" name="ext-${k}-visible" ${c.extras[k].visible ? "checked" : ""}> mostrar</span><input name="ext-${k}-url" placeholder="https://…" value="${e(c.extras[k].url || "")}"></label>`).join("")}</div>
          </div>
        </div>
        <div class="msg msg--info" style="margin:14px 0">💡 Los <b>precios</b> se toman de <b>Servicios</b> (por tipo de vehículo). Aquí eliges qué se muestra y cómo se describe.</div>
        ${grupo("🚗 Lavados", sv.filter(s => s.negocio === "autolavado" && s.categoria === "lavado"), "lavado")}
        ${grupo("✨ Servicios extra", sv.filter(s => s.negocio === "autolavado" && s.categoria === "extra"), "extra")}
        ${grupo("✂️ Barbería", sv.filter(s => s.negocio === "barberia"), "barberia")}
        <div class="msg msg--danger hidden" id="nfcc-err"></div>
        <div class="nfcc-guardar"><button class="btn btn--primary" type="submit">💾 Guardar cambios</button></div>
      </form>`;
    dibujarQR($("nfcc-qr"), c.urlPublica);
  }

  function datosFormulario() {
    const f = $("nfcc-form"), servicios = {};
    f.querySelectorAll("[data-sid]").forEach(r => {
      const g = k => r.querySelector(`[data-f="${k}"]`);
      servicios[r.dataset.sid] = { visible: g("visible").checked, destacado: g("destacado") ? g("destacado").checked : false,
        incluye: g("incluye") ? g("incluye").value : (DEMO.configuracion.catalogo.servicios[r.dataset.sid] || {}).incluye || [],
        descripcion: g("descripcion") ? g("descripcion").value : "" };
    });
    return {
      urlPublica: $("nfcc-url").value, titulo: f.titulo.value, subtitulo: f.subtitulo.value, textoLealtad: f.textoLealtad.value, mostrarPrecios: f.mostrarPrecios.checked,
      redes: Object.fromEntries(["facebook", "instagram", "tiktok", "whatsapp"].map(k => [k, f[`red-${k}`].value])),
      extras: Object.fromEntries(["encuesta", "waze"].map(k => [k, { visible: f[`ext-${k}-visible`].checked, url: f[`ext-${k}-url`].value }])),
      servicios,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = $("nfc-config-root");
    root.addEventListener("submit", async ev => {
      ev.preventDefault();
      const er = $("nfcc-err"); er.classList.add("hidden");
      const r = await APP.ejecutar(ev.target.querySelector("[type=submit]"), () => API.portal.guardarCatalogo(datosFormulario()), "Guardando…");
      if (!r.ok) { er.textContent = r.error; er.classList.remove("hidden"); er.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      APP.toast("success", "Página NFC actualizada", "Los clientes ya ven los cambios."); pintar();
    });
    root.addEventListener("change", ev => { const r = ev.target.closest("[data-sid]"); if (r && ev.target.dataset.f === "visible") r.classList.toggle("is-off", !ev.target.checked); });
    root.addEventListener("click", async ev => {
      if (ev.target.closest("#nfcc-terminal")) return APP.abrirTerminal("nfc");
      if (ev.target.closest("#nfcc-copiar")) { const u = $("nfcc-url").value; try { await navigator.clipboard.writeText(u); APP.toast("success", "Enlace copiado", u); } catch { APP.toast("info", "Copiá el enlace", u); } }
      if (ev.target.closest("#nfcc-qr-bajar")) {
        const img = $("nfcc-qr").querySelector("img, canvas");
        if (!img) return APP.toast("warning", "QR no disponible", "Se necesita conexión a internet para generarlo.");
        const a = document.createElement("a"); a.download = "qr-el-rapido-nfc.png"; a.href = img.tagName === "CANVAS" ? img.toDataURL("image/png") : img.src; a.click();
      }
    });
    root.addEventListener("input", ev => { if (ev.target.id === "nfcc-url") { clearTimeout(root._t); root._t = setTimeout(() => dibujarQR($("nfcc-qr"), ev.target.value), 500); } });
    APP.registerPage("nfc-config", pintar);
  });
})();
