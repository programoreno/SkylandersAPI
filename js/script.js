/* ============================================================
   Archivo de Skylanders — consumo de la API REST de Supabase
   Solo lectura (GET). Formato JSON interactivo por pestañas.
   ============================================================ */

const SUPABASE_URL = "https://wtcdmpgembpkdaigmzmc.supabase.co";
const API_KEY = "sb_publishable_iMxNU9BPOvqNM8fe_z4KlA_kkIz0PST";

const HEADERS = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`
};

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
    searchLabel: "Buscar personaje por nombre"
  },
  { key: "elemento", label: "Elementos", table: "elemento", select: "*", searchLabel: "Buscar elemento por nombre" },
  { key: "saga", label: "Sagas", table: "saga", select: "*", searchLabel: "Buscar saga por nombre" },
  { key: "edicion", label: "Ediciones", table: "edicion", select: "*", searchLabel: "Buscar edición por nombre" },
  { key: "equipo", label: "Equipos", table: "equipo", select: "*", searchLabel: "Buscar equipo por nombre" },
  { key: "habilidad", label: "Habilidades", table: "habilidad", select: "*", searchLabel: "Buscar habilidad por nombre" },
  { key: "clase", label: "Clase", table: "clase", select: "*", searchLabel: "Buscar habilidad por nombre" }
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
const gridEl = document.getElementById("cardGrid"); // Seguirá siendo el contenedor principal

/* ------------------------------------------------------------
   Construcción de la navegación (Pestañas)
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
  mostrarEstado("Invocando...", false);
  try {
    const datos = await cargarTabla(currentTab, null);
    ocultarEstado();
    pintarJSON(datos);
  } catch (e) {
    mostrarEstado(`No se pudieron extraer las runas: ${e.message}`, true);
  }
}

async function buscar() {
  const valor = searchInputEl.value.trim();
  if (!valor) { cargarTodos(); return; }

  mostrarEstado(`Buscando "${valor}" en los archivos...`, false);
  try {
    const datos = await cargarTabla(currentTab, valor);
    ocultarEstado();
    if (!datos.length) {
      mostrarEstado("Ups, no hay resultados para esta busqueda.", false);
      return;
    }
    pintarJSON(datos);
  } catch (e) {
    mostrarEstado(`No se pudo completar la busqueda: ${e.message}`, true);
  }
}

/* ------------------------------------------------------------
   Renderizador en formato JSON limpio
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   Renderizador en formato JSON con colores (Syntax Highlighting)
   ------------------------------------------------------------ */
function pintarJSON(datos) {
  gridEl.innerHTML = "";
  if (!datos.length) {
    mostrarEstado("Esta roca está lisa: la tabla no tiene registros.", false);
    return;
  }

  // 1. Convertimos el objeto a cadena JSON formateada
  let jsonString = JSON.stringify(datos, null, 2);

  // 2. Escapamos caracteres HTML para evitar conflictos
  jsonString = jsonString
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. Expresión regular para identificar claves, strings, números, etc.
  const regexJSON = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

  // 4. Aplicamos los spans con clases según el tipo de dato encontrado
  const jsonColoreado = jsonString.replace(regexJSON, function (match) {
    let cls = "json-number";
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = "json-key";
      } else {
        cls = "json-string";
      }
    } else if (/true|false/.test(match)) {
      cls = "json-boolean";
    } else if (/null/.test(match)) {
      cls = "json-null";
    }
    return `<span class="${cls}">${match}</span>`;
  });

  // 5. Creamos el contenedor <pre> y metemos el código coloreado
  const pre = document.createElement("pre");
  pre.className = "json-pre-container"; // Usamos una clase CSS externa
  
  const code = document.createElement("code");
  code.innerHTML = jsonColoreado; // Insertamos el HTML con los spans
  
  pre.appendChild(code);
  gridEl.appendChild(pre);
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
