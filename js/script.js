/* ============================================================
   Archivo de Skylanders — consumo de la API REST de Supabase
   Solo lectura (GET). Formato JSON Unificado sin Pestañas.
   ============================================================ */

const SUPABASE_URL = "https://wtcdmpgembpkdaigmzmc.supabase.co";
const API_KEY = "sb_publishable_iMxNU9BPOvqNM8fe_z4KlA_kkIz0PST";

const HEADERS = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`
};

/* Esquema de las tablas a consultar en Supabase */
const TABLAS_CONFIG = [
  { key: "personajes", table: "personaje", select: "*,elemento(nombre),saga(nombre),edicion(nombre),equipo(nombre),habilidad(nombre)", fallbackSelect: "*" },
  { key: "elementos", table: "elemento", select: "*" },
  { key: "sagas", table: "saga", select: "*" },
  { key: "ediciones", table: "edicion", select: "*" },
  { key: "equipos", table: "equipo", select: "*" },
  { key: "habilidades", table: "habilidad", select: "*" }
];

// Almacén global para guardar el JSON completo de la base de datos
let baseDeDatosJSON = {};

/* ------------------------------------------------------------
   Elementos del DOM
   ------------------------------------------------------------ */
const searchInputEl = document.getElementById("searchInput");
const searchBtnEl = document.getElementById("searchBtn");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusArea");
const gridEl = document.getElementById("cardGrid"); // Aquí se pintará el <pre> con el JSON

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

async function cargarTabla(config) {
  const base = `${SUPABASE_URL}/rest/v1/${config.table}`;
  const select = config.select || "*";
  const url = `${base}?select=${encodeURIComponent(select)}`;

  try {
    return await pedirDatos(url);
  } catch (e) {
    if (config.fallbackSelect) {
      return await pedirDatos(`${base}?select=${encodeURIComponent(config.fallbackSelect)}`);
    }
    throw e;
  }
}

/* ------------------------------------------------------------
   Estados de carga / error
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
   Carga Inicial (Descarga todo en paralelo)
   ------------------------------------------------------------ */
async function cargarTodoElArchivo() {
  mostrarEstado("Invocando el archivo completo desde los monolitos de Supabase...", false);
  try {
    // Descargamos todas las tablas al mismo tiempo
    const promesas = TABLAS_CONFIG.map(config => cargarTabla(config));
    const resultados = await Promise.all(promesas);

    // Construimos el objeto JSON unificado
    baseDeDatosJSON = {};
    TABLAS_CONFIG.forEach((config, index) => {
      baseDeDatosJSON[config.key] = resultados[index];
    });

    ocultarEstado();
    mostrarJSON(baseDeDatosJSON);
  } catch (e) {
    mostrarEstado(`Error al extraer el archivo JSON: ${e.message}`, true);
  }
}

/* ------------------------------------------------------------
   Filtrado e Impresión del JSON
   ------------------------------------------------------------ */
function mostrarJSON(objeto) {
  gridEl.innerHTML = "";
  
  // Creamos una etiqueta <pre> y <code> para mantener el formateado limpio de JSON
  const pre = document.createElement("pre");
  pre.style.textAlign = "left";
  pre.style.background = "#1e1e1e";
  pre.style.color = "#a9dc76";
  pre.style.padding = "15px";
  pre.style.borderRadius = "8px";
  pre.style.overflowX = "auto";
  pre.style.fontSize = "14px";
  
  const code = document.createElement("code");
  code.textContent = JSON.stringify(objeto, null, 2); // Indentación de 2 espacios
  
  pre.appendChild(code);
  gridEl.appendChild(pre);
}

function buscar() {
  const termino = searchInputEl.value.trim().toLowerCase();
  if (!termino) { 
    mostrarJSON(baseDeDatosJSON); 
    return; 
  }

  // Clonamos el objeto para filtrar sin destruir los datos originales
  const jsonFiltrado = {};

  for (const [tabla, registros] of Object.entries(baseDeDatosJSON)) {
    // Filtramos cada tabla buscando si el nombre coincide parcialmente con la búsqueda
    const coincidencias = registros.filter(reg => 
      reg.nombre && reg.nombre.toLowerCase().includes(termino)
    );
    
    // Solo añadimos la propiedad al JSON de salida si tiene resultados
    if (coincidencias.length > 0) {
      jsonFiltrado[tabla] = coincidencias;
    }
  }

  if (Object.keys(jsonFiltrado).length === 0) {
    mostrarEstado(`No se encontraron registros que coincidan con "${termino}"`, false);
  } else {
    ocultarEstado();
    mostrarJSON(jsonFiltrado);
  }
}

/* ------------------------------------------------------------
   Eventos e Inicio
   ------------------------------------------------------------ */
searchBtnEl.addEventListener("click", buscar);
searchInputEl.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
clearBtnEl.addEventListener("click", () => { searchInputEl.value = ""; ocultarEstado(); mostrarJSON(baseDeDatosJSON); });

// Modificamos el label estático de búsqueda si existe en el DOM
const searchLabelEl = document.getElementById("searchLabel");
if (searchLabelEl) searchLabelEl.textContent = "Buscar en todo el archivo (por nombre)";

// Arrancar la descarga
cargarTodoElArchivo();
