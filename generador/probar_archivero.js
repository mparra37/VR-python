// Prueba de El archivero: imprime N preguntas al azar (JSON) para que generar.py las compare con Python.
const L = require('../js/archivero_logica.js');

const n = Number(process.argv[2] || 300);
const azar = L.crearAzar(2026);
const casos = [];
for (let i = 0; i < n; i++) {
  const datos = L.nuevosDatos(azar);
  const tipo = L.TIPOS[i % L.TIPOS.length];
  const q = L.pregunta({ nombres: datos.nombres.slice(), prom: datos.prom.slice() }, tipo, azar);
  casos.push({ nombres: datos.nombres, promPy: L.listaPython(datos.prom), codigo: q.codigo, correcta: q.correcta, falsas: q.falsas });
}
process.stdout.write(JSON.stringify(casos));
