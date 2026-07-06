/* ============================================================
   Archivo de Skylanders — consumo de la API REST de Supabase
   Solo lectura (GET). Usa la clave "anon / publishable",
   nunca la "service_role" en un frontend público.
   ============================================================ */

const SUPABASE_URL = "https://wtcdmpgembpkdaigmzmc.supabase.co";
const API_KEY = "sb_publishable_iMxNU9BPOvqNM8fe_z4KlA_kkIz0PST";

const HEADERS = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`
};

/* Mapa de elementos de Skylanders -> color y símbolo del sello */
const ELEMENTOS = {
  fuego:        { color: "#C0392B", icon: "🔥" },
  agua:         { color: "#2E86AB", icon: "💧" },
  aire:         { color: "#AED6F1", icon: "🌪️" },
  tierra:       { color: "#8B5E34", icon: "⛰️" },
  vida:         { color: "#4B8B3B", icon: "🌿" },
  muertos:      { color: "#6C3483", icon: "💀" },
  magia:        { color: "#A569BD", icon: "✨" },
  tecnologia:   { color: "#D68910", icon: "⚙️" },
  tecnología:   { color: "#D68910", icon: "⚙️" },
  luz:          { color: "#D4AC0D", icon: "☀️" },
  oscuridad:    { color: "#1C1C1C", icon: "🌑" }
};
const ELEMENTO_DEFAULT = { color: "#555555", icon: "🛡️" };

function normaliza(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sellarElemento(nombre) {
  const key = normaliza(nombre);
  return ELEMENTOS[key] || ELEMENTO_DEFAULT;
}

/* ------------------------------------------------------------
   Definición de las secciones (pestañas) del archivo
   ------------------------------------------------------------ */
const TABS = [
  {
    key: "personaje",
    label: "Personajes",
    table: "personaje",
    select: "*,elemento(nombre),saga(nombre),edicion(nombre),equipo(nombre),habilidad(nombre)",
    fallbackSelect: "*",
    searchLabel: "Buscar personaje por nombre",
    render: renderPersonaje
  },
  { key: "elemento", label: "Elementos", table: "elemento", select: "*", searchLabel: "Buscar elemento por nombre", render: renderSimple("Elemento") },
  { key: "saga", label: "Sagas", table: "saga", select: "*", searchLabel: "Buscar saga por nombre", render: renderSimple("Saga") },
  { key: "edicion", label: "Ediciones", table: "edicion", select: "*", searchLabel: "Buscar edición por nombre", render: renderSimple("Edición") },
  { key: "equipo", label: "Equipos", table: "equipo", select: "*", searchLabel: "Buscar equipo por nombre", render: renderSimple("Equipo") },
  { key: "habilidad", label: "Habilidades", table: "habilidad", select: "*", searchLabel: "Buscar habilidad por nombre", render: renderSimple("Habilidad") }
];

let currentTab = TABS[0];

/* ------------------------------------------------------------
   Elementos del DOM
   ------------------------------------------------------------ */
const tabletsEl = document.getElementById("tablets");
const searchLabelEl = document.getElementById("searchLabel");
const searchInputEl = document.getElementById("searchInput");
const searchBtnEl = document.getElementById("searchBtn");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusArea");
const gridEl = document.getElementById("cardGrid");

/* ------------------------------------------------------------
   Construcción de la navegación
   ------------------------------------------------------------ */
function construirTablets() {
  tabletsEl.innerHTML = "";
  TABS.forEach(tab => {
    const btn = document.createElement("button");
    btn.className = "tablet-btn" + (tab.key === currentTab.key ? " active" : "");
    btn.textContent = tab.label;
    btn.addEventListener("click", () => cambiarTab(tab));
    btn.dataset.key = tab.key;
    tabletsEl.appendChild(btn);
  });
}

function cambiarTab(tab) {
  currentTab = tab;
  [...tabletsEl.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.key === tab.key);
  });
  searchLabelEl.textContent = tab.searchLabel;
  searchInputEl.value = "";
  cargarTodos();
}

/* ------------------------------------------------------------
   Llamadas a la API (solo GET)
   ------------------------------------------------------------ */
async function pedirDatos(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${texto}`.trim());
  }
  return res.json();
}

async function cargarTabla(tab, busquedaNombre) {
  const base = `${SUPABASE_URL}/rest/v1/${tab.table}`;
  const select = tab.select || "*";
  const params = new URLSearchParams({ select });
  
  // Si hay búsqueda, usamos ilike para buscar coincidencias parciales por nombre
  if (busquedaNombre) {
    params.set("nombre", `ilike.*${busquedaNombre}*`);
  }
  
  const url = `${base}?${params.toString()}`;

  try {
    return await pedirDatos(url);
  } catch (e) {
    if (tab.fallbackSelect) {
      const paramsPlano = new URLSearchParams({ select: tab.fallbackSelect });
      if (busquedaNombre) {
        paramsPlano.set("nombre", `ilike.*${busquedaNombre}*`);
      }
      return await pedirDatos(`${base}?${paramsPlano.toString()}`);
    }
    throw e;
  }
}

/* ------------------------------------------------------------
   Estados de carga / error / vacío
   ------------------------------------------------------------ */
function mostrarEstado(texto, esError) {
  statusEl.hidden = false;
  statusEl.textContent = texto;
  statusEl.classList.toggle("error", !!esError);
  gridEl.innerHTML = "";
}

function ocultarEstado() {
  statusEl.hidden = true;
}

/* ------------------------------------------------------------
   Carga principal y Búsqueda
   ------------------------------------------------------------ */
async function cargarTodos() {
  mostrarEstado("Picando en la roca de las runas...", false);
  try {
    const datos = await cargarTabla(currentTab, null);
    ocultarEstado();
    pintar(datos);
  } catch (e) {
    mostrarEstado(`No se pudieron extraer las runas: ${e.message}`, true);
  }
}

async function buscar() {
  const valor = searchInputEl.value.trim();
  if (!valor) { cargarTodos(); return; }

  mostrarEstado(`Buscando "${valor}" en los monolitos...`, false);
  try {
    const datos = await cargarTabla(currentTab, valor);
    ocultarEstado();
    if (!datos.length) {
      mostrarEstado("Esta roca está lisa: no hay resultados para ese nombre.", false);
      return;
    }
    pintar(datos);
  } catch (e) {
    mostrarEstado(`No se pudo completar la excavación: ${e.message}`, true);
  }
}

function pintar(datos) {
  gridEl.innerHTML = "";
  if (!datos.length) {
    mostrarEstado("Esta roca está lisa: la tabla no tiene registros.", false);
    return;
  }
  datos.forEach(fila => gridEl.appendChild(currentTab.render(fila)));
}

/* ------------------------------------------------------------
   Renderizadores de tarjetas
   ------------------------------------------------------------ */
function crearCard() {
  const card = document.createElement("article");
  card.className = "card";
  return card;
}

function renderSimple(etiqueta) {
  return function (fila) {
    const card = crearCard();
    card.innerHTML = `
      <p class="card-id">${etiqueta} · ID ${fila.id}</p>
      <h3 class="card-title">${fila.nombre ?? "(sin nombre)"}</h3>
    `;
    return card;
  };
}

function renderPersonaje(fila) {
  const card = crearCard();
  const nombreElemento = fila.elemento?.nombre;
  const sello = sellarElemento(nombreElemento);

  const saga = fila.saga?.nombre ?? fila.saga ?? "—";
  const edicion = fila.edicion?.nombre ?? fila.edicion ?? "—";
  const equipo = fila.equipo?.nombre ?? fila.equipo ?? "—";
  const habilidad = fila.habilidad?.nombre ?? fila.habilidad ?? "—";
  const elementoTexto = nombreElemento ?? fila.elemento ?? "—";

  card.innerHTML = `
    <div class="seal" style="background:${sello.color}" title="Elemento: ${elementoTexto}">
      <span aria-hidden="true">${sello.icon}</span>
    </div>
    <p class="card-id">Personaje · ID ${fila.id}</p>
    <h3 class="card-title">${fila.nombre ?? "(sin nombre)"}</h3>
    <p class="card-meta"><b>Elemento:</b> ${elementoTexto}</p>
    <p class="card-meta"><b>Saga:</b> ${saga}</p>
    <p class="card-meta"><b>Edición:</b> ${edicion} &nbsp;|&nbsp; <b>Serie:</b> ${fila.serie ?? "—"}</p>
    <p class="card-meta"><b>Equipo:</b> ${equipo}</p>
    <p class="card-meta"><b>Habilidad:</b> ${habilidad}</p>
    ${fila.frase ? `<p class="card-quote">“${fila.frase}”</p>` : ""}
    ${fila.descripcion ? `
      <p class="card-desc collapsed" id="desc-${fila.id}">${fila.descripcion}</p>
      <button class="expand-btn" data-target="desc-${fila.id}">Escupir el resto del grabado</button>
    ` : ""}
  `;

  const btn = card.querySelector(".expand-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const desc = card.querySelector(`#desc-${fila.id}`);
      const expandido = desc.classList.toggle("collapsed") === false;
      btn.textContent = expandido ? "Ocultar grabado" : "Escupir el resto del grabado";
    });
  }

  return card;
}

/* ------------------------------------------------------------
   Eventos e inicio
   ------------------------------------------------------------ */
searchBtnEl.addEventListener("click", buscar);
searchInputEl.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
clearBtnEl.addEventListener("click", () => { searchInputEl.value = ""; cargarTodos(); });

construirTablets();
searchLabelEl.textContent = currentTab.searchLabel;
cargarTodos();