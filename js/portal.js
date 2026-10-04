/* ==========================================================================
   portal.js — Página del cliente (NFC / QR del local).

   Pantallas: inicio → catálogo · servicios extra · mi tarjeta de fidelidad.
   La misma interfaz se usa en:
     • nfc.html  (pública: el enlace que abre el chip NFC / QR o el botón de Beacons)
     • Terminal NFC del panel (solo administrador: vista previa y consulta directa)

   Solo LEE datos (API.portal.*). El cliente se identifica con su nombre + los últimos 2 dígitos de su celular
   (la lealtad cubre cualquier vehículo del cliente).
   ► Producción: estas llamadas irán a /api/publico/* del servidor (Render + PostgreSQL).
   ========================================================================== */
const PORTAL = (() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const C$ = n => "C$ " + Number(n || 0).toLocaleString("es-NI", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fecha = d => new Date(d).toLocaleDateString("es-NI", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  const CLAVE = "elrapido_nfc_tarjeta_v2";   // "Recordarme": en producción será un token seguro, no los datos.

  const ICONOS = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm6-7.9a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1zM21.9 8a6.1 6.1 0 0 0-1.7-4.2A6.1 6.1 0 0 0 16 2.1C14.4 2 9.6 2 8 2.1a6.1 6.1 0 0 0-4.2 1.7A6.1 6.1 0 0 0 2.1 8C2 9.6 2 14.4 2.1 16a6.1 6.1 0 0 0 1.7 4.2A6.1 6.1 0 0 0 8 21.9c1.6.1 6.4.1 8 0a6.1 6.1 0 0 0 4.2-1.7 6.1 6.1 0 0 0 1.7-4.2c.1-1.6.1-6.4 0-8zm-2 9.9a3.3 3.3 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.6.4s-4.4.1-5.6-.4a3.3 3.3 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.6s-.1-4.4.4-5.6a3.3 3.3 0 0 1 1.8-1.8C6.1 4.4 9.1 4.5 12 4.5s4.4-.1 5.6.4a3.3 3.3 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.6s.1 4.3-.4 5.6z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6 2.5 2.5 0 0 1 .8.1V9.7a5.8 5.8 0 0 0-.8-.1 5.8 5.8 0 1 0 5.8 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.4-1.6z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8.9-.9 1.1-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6a.5.5 0 0 0 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.8a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.9 17.8L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.4 1.4A11.8 11.8 0 0 0 20.4 3.6z"/></svg>',
  };

  function montar(root, { modo = "publico", logo = "assets/logo-el-rapido.png" } = {}) {
    const st = { vista: "inicio", tab: "programas", catTab: "lavados", cat: null, cliente: null, credenciales: null, error: "", cargando: false };
    const admin = modo === "admin";
    root.classList.add("np");

    async function cargarCatalogo() { const r = await API.portal.catalogo(); if (r.ok) st.cat = r.data; }

    // ---------------------------------------------------------------- pantallas
    function pInicio() {
      const c = st.cat, r = c.redes || {};
      const red = (k, nombre) => r[k] ? `<a class="np-link" href="${esc(r[k])}" target="_blank" rel="noopener"><span class="np-link__ic np-link__ic--${k}">${ICONOS[k]}</span><span>${nombre}</span></a>` : "";
      const extra = (k, titulo, texto) => c.extras && c.extras[k] && c.extras[k].visible && c.extras[k].url
        ? `<a class="np-link np-link--txt" href="${esc(c.extras[k].url)}" target="_blank" rel="noopener"><span><strong>${titulo}</strong><small>${texto}</small></span></a>` : "";
      return `<div class="np-hero"><div class="np-hero__logo"><img src="${esc(logo)}" alt="El Rápido"></div><h1>${esc(c.titulo)}</h1><p>${esc(c.subtitulo)}</p></div>
        <div class="np-cards">
          <button type="button" class="np-card np-card--doble" data-ir="catalogo"><span class="np-card__arte"><b>CATÁLOGO</b><i>DE</i><b class="rojo">SERVICIOS</b></span><span class="np-card__txt">Lavados, precios y barbería</span></button>
          <button type="button" class="np-card" data-ir="extras"><strong>Servicios EXTRAS</strong><small>Agregalos a tu lavado</small></button>
          <button type="button" class="np-card np-card--fidelidad" data-ir="lealtad"><span><strong>Mi Tarjeta de Fidelidad</strong><small>${esc(c.textoLealtad)}</small></span><span class="np-sellos-mini">${Array.from({ length: 9 }, (_, i) => `<i class="${i === 4 || i === 8 ? "g" : ""}">${i === 4 || i === 8 ? "🎁" : ""}</i>`).join("")}</span></button>
          ${extra("encuesta", "Encuesta El Rápido", "Contanos cómo mejorar tu experiencia")}
          ${red("facebook", "Facebook")}${red("instagram", "Instagram")}${red("tiktok", "TikTok")}${red("whatsapp", "WhatsApp " + esc(c.negocio.telefono))}
          ${extra("waze", "El Rápido en Waze", "Llegá fácilmente")}
        </div>
        <p class="np-pie">${esc(c.negocio.direccion)}</p>`;
    }

    function precioServicio(s, mostrar) {
      if (!mostrar) return "";
      if (s.precios && s.precios.length) return `<div class="np-precios">${s.precios.map(p => `<span><em>${esc(p.tipo)}</em><b>${C$(p.precio)}</b></span>`).join("")}</div>`;
      return s.precio ? `<div class="np-precio">${C$(s.precio)}</div>` : `<div class="np-precio np-precio--consultar">Consultá el precio en caja</div>`;
    }
    function pCatalogo() {
      const c = st.cat, tabs = [["lavados", "🚗 Lavados"], ["barberia", "✂️ Barbería"], ["membresias", "🎫 Membresías"]];
      let cuerpo = "";
      if (st.catTab === "lavados") cuerpo = c.lavados.map(s => `<article class="np-serv ${s.destacado ? "is-destacado" : ""}">
          ${s.destacado ? '<span class="np-badge">★ Recomendado</span>' : ""}<h3>${esc(s.nombre)}</h3>
          ${s.incluye.length ? `<ul>${s.incluye.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : (s.descripcion ? `<p>${esc(s.descripcion)}</p>` : "")}
          ${precioServicio(s, c.mostrarPrecios)}</article>`).join("") || '<p class="np-vacio">Pronto publicaremos nuestros lavados.</p>';
      else if (st.catTab === "barberia") cuerpo = `<div class="np-lista">${c.barberia.map(s => `<div class="np-fila"><span><strong>${esc(s.nombre)}</strong>${s.descripcion ? `<small>${esc(s.descripcion)}</small>` : ""}</span>${c.mostrarPrecios ? `<b>${s.precio ? C$(s.precio) : "—"}</b>` : ""}</div>`).join("")}</div>`;
      else cuerpo = c.membresias.map(m => `<article class="np-serv np-serv--mem"><h3>${esc(m.nombre)}</h3><p>Descuento del ${m.descuento}% en lavados. Válido por ${m.dias % 7 === 0 ? m.dias / 7 + " semanas" : m.dias + " días"}.</p>
          <div class="np-chips"><span>${m.descuento}% desc.</span><span>${m.lavados} lavados</span><span>${m.dias} días</span></div></article>`).join("")
          + '<p class="np-nota">Las membresías son para un solo vehículo (placa). Consultá en caja.</p>';
      return `${cabecera("Catálogo de servicios")}<div class="np-tabs">${tabs.map(([k, l]) => `<button class="${st.catTab === k ? "on" : ""}" data-cat="${k}">${l}</button>`).join("")}</div>${cuerpo}
        ${st.catTab === "lavados" && c.mostrarPrecios ? '<p class="np-nota">Precios por tipo de vehículo. Descuento del 66% para taxis miembros.</p>' : ""}`;
    }
    function pExtras() {
      const c = st.cat;
      return `${cabecera("Servicios EXTRAS")}<p class="np-intro">Agregá cualquiera de estos extras a tu lavado:</p>
        <div class="np-lista">${c.serviciosExtra.map(s => `<div class="np-fila"><span><strong>${esc(s.nombre)}</strong>${s.descripcion ? `<small>${esc(s.descripcion)}</small>` : ""}</span>${c.mostrarPrecios ? `<b>${s.precio ? C$(s.precio) : (s.precios && s.precios.length ? "desde " + C$(Math.min(...s.precios.map(p => p.precio))) : "Consultar")}</b>` : ""}</div>`).join("") || '<p class="np-vacio">Pronto publicaremos los extras.</p>'}</div>`;
    }

    function pIngreso() {
      return `${cabecera("Mi Tarjeta de Fidelidad")}
        <div class="np-box">
          <div class="np-box__ic">⭐</div>
          <h2>Consultá tu progreso</h2>
          <form id="np-form" novalidate>
            <label>Tu nombre<input name="nombre" autocomplete="name" placeholder="Nombre y apellido" maxlength="60"></label>
            <label>Últimos 2 dígitos de tu celular<input name="digitos" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="00" maxlength="2" class="np-digitos"></label>
            ${admin ? "" : '<label class="np-check"><input type="checkbox" name="recordar" checked> Recordarme en este celular</label>'}
            ${st.error ? `<div class="np-error">${esc(st.error)}</div>` : ""}
            <button class="np-btn" type="submit" ${st.cargando ? "disabled" : ""}>${st.cargando ? "Consultando…" : "Ver mi tarjeta"}</button>
          </form>
        </div>`;
    }

    function sellos(p) {
      return `<div class="np-sellos">${Array.from({ length: p.meta2 }, (_, i) => { const n = i + 1, on = n <= p.lavadas, gift = n === p.meta1 || n === p.meta2;
        return `<span class="${on ? "on" : ""} ${gift ? "gift" : ""}">${gift ? "🎁" : n}</span>`; }).join("")}</div>`;
    }
    function tarjetaPrograma(p, v) {
      return `<section class="np-prog np-prog--${esc(p.id)}">
        <div class="np-prog__top"><div><span class="np-prog__tag">${p.icono} ${esc(p.nombre.toUpperCase())}</span><h2>${esc(v.nombre)}</h2></div>
          <div class="np-prog__cont"><b>${p.lavadas}</b><span>/ ${p.meta2}</span></div></div>
        ${sellos(p)}
        <div class="np-prog__barra"><span>Progreso del ciclo</span><b>${p.pct}%</b></div><div class="np-bar"><i style="width:${p.pct}%"></i></div>
        <div class="np-stats"><div><small>TOTAL</small><b>${p.total}</b><span>lavados</span></div><div><small>CICLO</small><b>${p.ciclo}</b><span>actual</span></div><div><small>FALTAN</small><b>${p.disp2 ? 0 : p.faltan2}</b><span>para el final</span></div></div>
      </section>
      <section class="np-recompensa ${p.disp1 || p.disp2 ? "is-on" : ""}">
        ${p.disp2 ? `<div class="np-premio-ok">🎉 ¡Tenés tu premio final disponible!<strong>${esc(p.final)}</strong><small>Pedilo en caja en tu próxima visita.</small></div>`
          : p.disp1 ? `<div class="np-premio-ok">🎉 ¡Ya podés elegir tu recompensa!<strong>${p.opciones.map(esc).join(" ó ")}</strong><small>Pedila en caja al pagar tu lavado.</small></div>`
          : `<div class="np-prox"><span class="np-prox__ic">🎁</span><div><small>PRÓXIMA RECOMPENSA</small>
              ${!p.canje1 && p.lavadas < p.meta1 ? `<strong>${p.meta1} lavados → Elegí tu recompensa</strong>${p.opciones.map((o, i) => `<span>${i ? "⭐" : "🫧"} ${esc(o)}</span>`).join("")}`
                : `<strong>${p.meta2} lavados → ${esc(p.final)}</strong>`}</div></div>
            ${(() => { const a1 = !p.canje1 && p.lavadas < p.meta1, n = a1 ? p.faltan1 : p.faltan2, meta = a1 ? p.meta1 : p.meta2;
              return `<div class="np-faltan">💧 Te ${n === 1 ? "falta" : "faltan"} <b>${n}</b> lavado${n === 1 ? "" : "s"} para llegar al #${meta}<small>Suma cada ${esc(p.servicio)}</small></div>`; })()}`}
      </section>`;
    }
    function pTarjeta() {
      const v = st.cliente, mems = v.membresias.filter(m => m.estado === "Activa" || m.estado === "Por vencer");
      const tabs = [["programas", "✨ Programa actual"], ["membresia", `🎫 Membresía${mems.length ? " ·" + mems.length : ""}`], ["historial", "🕒 Historial"]];
      let cuerpo;
      if (st.tab === "programas") cuerpo = v.programas.map(p => tarjetaPrograma(p, v)).join("")
        + `<section class="np-ultimos"><h3>🕒 ÚLTIMOS LAVADOS REGISTRADOS</h3>${v.ultimasLavadas.slice(0, 5).map(x => `<div><i></i><strong>${esc(x.servicio)}</strong><span>${fecha(x.fecha)}</span></div>`).join("") || '<p class="np-vacio">Aún no hay lavados registrados.</p>'}</section>`;
      else if (st.tab === "membresia") cuerpo = v.membresias.length ? v.membresias.map(m => `<section class="np-mem ${m.estado === "Activa" || m.estado === "Por vencer" ? "" : "is-off"}">
          <div class="np-mem__top"><strong>${esc(m.plan)}</strong><span class="np-mem__estado">${esc(m.estado)}</span></div>
          <small>${esc(m.servicio)} · ${esc(m.vehiculo)} · placa ${esc(m.placa)}</small>
          <div class="np-mem__num"><b>${m.restantes}</b><span>lavado${m.restantes === 1 ? "" : "s"} disponible${m.restantes === 1 ? "" : "s"} de ${m.lavados}</span></div>
          <div class="np-bar"><i style="width:${Math.round(m.usados / m.lavados * 100)}%"></i></div>
          <p>Vence el <b>${fecha(m.vence)}</b>. Válida solo para el vehículo ${esc(m.placa)}.</p></section>`).join("")
        : `<div class="np-box"><div class="np-box__ic">🎫</div><h2>Sin membresía</h2><p>Con un Combo de lavados ahorrás en cada visita. Preguntá en caja.</p><button class="np-btn np-btn--ghost" data-ir="catalogo" data-cattab="membresias">Ver membresías</button></div>`;
      else cuerpo = `<section class="np-ultimos"><h3>🧽 LAVADOS</h3>${v.ultimasLavadas.map(x => `<div><i></i><strong>${esc(x.servicio)}</strong><span>${fecha(x.fecha)}</span></div>`).join("") || '<p class="np-vacio">Sin lavados registrados.</p>'}</section>
        <section class="np-ultimos np-ultimos--canje"><h3>🎁 PREMIOS CANJEADOS</h3>${v.canjes.map(x => `<div><i></i><strong>${esc(x.concepto)}</strong><span>${fecha(x.fecha)}</span></div>`).join("") || '<p class="np-vacio">Todavía no has canjeado premios.</p>'}</section>`;
      return `<div class="np-head"><span class="np-head__tag">ESTADO DE LEALTAD</span><h2>${esc(v.nombre)}</h2>${v.placas.length ? `<small>🚘 ${v.placas.map(esc).join(" · ")}</small>` : ""}</div>
        <div class="np-tabs np-tabs--3">${tabs.map(([k, l]) => `<button class="${st.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
        ${cuerpo}
        <button class="np-btn np-btn--azul" data-act="otra">↻ Consultar otra tarjeta</button>
        <button class="np-volver-inicio" data-ir="inicio">← Volver al inicio</button>`;
    }

    function cabecera(t) { return `<div class="np-bar-top"><button class="np-back" data-ir="inicio" aria-label="Volver">‹</button><h1>${esc(t)}</h1></div>`; }

    function render() {
      if (!st.cat) { root.innerHTML = `<div class="np-cargando"><img src="${esc(logo)}" alt=""><span>Cargando…</span></div>`; return; }
      const v = st.vista;
      root.innerHTML = `<div class="np-pantalla np-pantalla--${v}">${v === "inicio" ? pInicio() : v === "catalogo" ? pCatalogo() : v === "extras" ? pExtras() : st.cliente ? pTarjeta() : pIngreso()}</div>`;
      root.scrollTop = 0;
    }

    // ---------------------------------------------------------------- eventos
    root.addEventListener("click", ev => {
      const b = ev.target.closest("[data-ir], [data-cat], [data-tab], [data-act]"); if (!b) return;
      if (b.dataset.ir) { st.vista = b.dataset.ir; if (b.dataset.cattab) st.catTab = b.dataset.cattab; st.error = ""; render(); window.scrollTo && window.scrollTo(0, 0); }
      else if (b.dataset.cat) { st.catTab = b.dataset.cat; render(); }
      else if (b.dataset.tab) { st.tab = b.dataset.tab; render(); }
      else if (b.dataset.act === "otra") { st.cliente = null; st.credenciales = null; st.tab = "programas"; try { localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ } render(); }
    });
    root.addEventListener("submit", async ev => {
      if (ev.target.id !== "np-form") return;
      ev.preventDefault();
      const f = ev.target, cred = { nombre: f.nombre.value, digitos: f.digitos.value };
      st.cargando = true; st.error = ""; render();
      const r = await API.portal.ingresar(cred);
      st.cargando = false;
      if (!r.ok) { st.error = r.error; render(); const f2 = root.querySelector("#np-form"); if (f2) { f2.nombre.value = cred.nombre; f2.digitos.value = cred.digitos; } return; }
      st.cliente = r.data; st.credenciales = cred; st.tab = "programas";
      if (!admin && f.recordar && f.recordar.checked) { try { localStorage.setItem(CLAVE, JSON.stringify(cred)); } catch (e) { /* sin almacenamiento */ } }
      render();
    });

    // ---------------------------------------------------------------- API del componente
    const inst = {
      async iniciar({ vista = "inicio" } = {}) {
        st.vista = vista; st.cat = null; render();
        await cargarCatalogo();
        if (!admin) {   // "Recordarme": entra directo
          try { const g = JSON.parse(localStorage.getItem(CLAVE) || "null"); if (g) { const r = await API.portal.ingresar(g); if (r.ok) { st.cliente = r.data; st.credenciales = g; } else localStorage.removeItem(CLAVE); } } catch (e) { /* sin almacenamiento */ }
        }
        render();
      },
      // Solo administrador: abrir la tarjeta de un cliente sin verificación.
      async mostrarCliente(clienteId) {
        const r = await API.portal.vistaAdmin(clienteId);
        if (!r.ok) return r;
        st.cliente = r.data; st.vista = "lealtad"; st.tab = "programas"; if (!st.cat) await cargarCatalogo(); render(); return r;
      },
      async recargar() { await cargarCatalogo(); if (st.cliente && st.credenciales) { const r = await API.portal.ingresar(st.credenciales); if (r.ok) st.cliente = r.data; } render(); },
      ir(vista) { st.vista = vista; render(); },
      salirCliente() { st.cliente = null; st.credenciales = null; render(); },
    };
    return inst;
  }

  return { montar };
})();
