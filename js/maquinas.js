/* Enlace VR · Python · La máquina de funciones (TC1037)
 *
 * Cada función es una máquina. El Operador ve el programa que la llama (por ejemplo a = area(3, 4)) y,
 * a su izquierda, cubos con valores. El equipo tiene el código de las funciones en el manual. En 3 pasos:
 *   1. ¿Qué recibe? El Operador mete en cada parámetro de la máquina el cubo con su valor (en orden:
 *      en resta(b, a) el parámetro a recibe el valor de b).
 *   2. ¿Qué regresa? La máquina trabaja y sale un cubo con lo que regresa; gris y con None si la
 *      función solo hace print. El cubo va a la variable que lo guarda, al print o se pierde.
 *   3. ¿Qué sale en la pantalla? Lo que muestran los print (de la función y del programa).
 * +1 por paso bien hecho; error: bloqueo de 5 s y se muestra la respuesta. Ronda de 5 minutos.
 * Datos: js/datos_maquinas.js (generador/generar.py corre cada programa en Python y registra cada llamada).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, pintarPython, COLOR_PY */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosFinal: 3.5,
  retosPorNivel: 3,
  maquina: { x: 0, y: 1.82, z: -2.1, ancho: 1.5, alto: 0.85, fondo: 0.5 },
  cubo: 0.26,
  radioCubos: 1.85,
};

const LUGARES_CUBO = [{ a: -36, y: 1.5 }, { a: -49, y: 1.95 }, { a: -61, y: 1.45 }, { a: -74, y: 1.92 }, { a: -86, y: 1.45 }];
const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const enUnaLinea = (t) => t.replace(/\n/g, '  ⏎  ');

function pintarCubo(ctx, w, h, etiqueta, { elegido = false, gris = false } = {}) {
  ctx.fillStyle = gris ? '#3A414D' : (elegido ? '#1C3A66' : '#0C1628');
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = elegido ? 22 : 10;
  ctx.strokeStyle = elegido ? COLOR.acento : (gris ? '#8B95A7' : '#7FD1C7');
  ctx.strokeRect(5, 5, w - 10, h - 10);
  let tam = 96;
  ctx.font = `600 ${tam}px ${MONO}`;
  while (ctx.measureText(etiqueta).width > w - 40 && tam > 30) { tam *= 0.9; ctx.font = `600 ${tam}px ${MONO}`; }
  const color = /^['"]/.test(etiqueta) ? COLOR_PY.texto : /^-?\d/.test(etiqueta) ? COLOR_PY.numero : etiqueta === 'None' || gris ? '#C9D1DD' : COLOR_PY.normal;
  texto(ctx, etiqueta, w / 2, h / 2 + 4, { tam, peso: 600, color, alinear: 'center', fuente: MONO });
}

AFRAME.registerComponent('maquina-funciones', {
  init() {
    this.banco = window.MAQUINAS.retos;
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.reto = null;
    this.paso = '';
    this.animaciones = [];
    this.seleccion = null;
    this.construirEscena();
    this.el.sceneEl.addEventListener('boton-presionado', (e) => this.presionar(e.detail.accion, e.detail.valor));
    window.addEventListener('keydown', (e) => this.teclaFisica(e));
    this.mostrar('inicio');
    window.juego = this;
  },

  crearBoton(pantalla, textoBoton, x, y, opciones) {
    const el = crearEntidad(this.pantallas[pantalla], { position: `${x} ${y} 0.01`, boton: Object.assign({ texto: textoBoton }, opciones) });
    this.botones[pantalla].push(el);
    return el;
  },

  construirEscena() {
    const consola = crearConsola(this.el, 1.6, 1.05);
    ['inicio', 'juego', 'fin'].forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.22 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.11', position: '0 0.44 0' });
    this.lienzoPrograma = crearEntidad(jue, { lienzo: 'ancho: 0.74; alto: 0.38', position: '-0.38 0.18 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 0.74; alto: 0.38', position: '0.38 0.18 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.07', position: '0 -0.04 0' });
    this.opciones = [0, 1, 2, 3].map((i) => this.crearBoton('juego', '', i % 2 ? 0.38 : -0.38, i < 2 ? -0.15 : -0.29, { ancho: 0.73, alto: 0.12, accion: 'respuesta', valor: String(i) }));
    this.crearBoton('juego', 'Saltar', -0.42, -0.44, { ancho: 0.3, alto: 0.08, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.42, -0.44, { ancho: 0.3, alto: 0.08, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.12 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // la máquina: caja con engranes, la firma de la función al frente y un lugar por parámetro
    const M = CONFIG.maquina;
    this.maquina = crearEntidad(this.el, { position: `${M.x} ${M.y} ${M.z}` });
    crearEntidad(this.maquina, { geometry: `primitive: box; width: ${M.ancho}; height: ${M.alto}; depth: ${M.fondo}`, material: 'color: #13233D; roughness: 0.5; metalness: 0.5' });
    this.luz = crearEntidad(this.maquina, { geometry: `primitive: box; width: ${M.ancho + 0.04}; height: 0.03; depth: ${M.fondo + 0.04}`, material: 'shader: flat; color: #2F6FBF', position: `0 ${-M.alto / 2} 0` });
    this.engranes = [-0.35, 0.3].map((x, i) => crearEntidad(this.maquina, {
      geometry: `primitive: torus; radius: ${i ? 0.13 : 0.17}; radiusTubular: 0.03; segmentsTubular: 12`,
      material: 'color: #8B95A7; metalness: 0.8; roughness: 0.3', position: `${x} ${M.alto / 2 + 0.12} 0`,
    }));
    crearEntidad(this.maquina, { geometry: 'primitive: box; width: 0.3; height: 0.24; depth: 0.34', material: 'color: #0C1628; metalness: 0.4', position: `${M.ancho / 2 + 0.15} ${-M.alto / 2 + 0.16} 0` });
    this.frente = crearEntidad(this.maquina, { lienzo: `ancho: ${M.ancho - 0.04}; alto: ${M.alto - 0.04}`, position: `0 0 ${M.fondo / 2 + 0.003}` });
    this.huecos = [0, 1, 2].map((k) => {
      const zona = crearEntidad(this.maquina, {
        geometry: 'primitive: plane; width: 0.36; height: 0.3',
        material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false',
        position: `0 -0.08 ${M.fondo / 2 + 0.01}`, visible: false,
      });
      zona.addEventListener('mouseenter', () => { this.encima = k; this.dibujarMaquina(); });
      zona.addEventListener('mouseleave', () => { if (this.encima === k) this.encima = null; this.dibujarMaquina(); });
      zona.addEventListener('click', () => this.presionar('hueco', k));
      this.botones.juego.push(zona);
      return zona;
    });

    // cubos con valores, a la izquierda
    const C = CONFIG.cubo;
    this.cubos = LUGARES_CUBO.map((_, i) => {
      const el = crearEntidad(this.el, { visible: false });
      crearEntidad(el, { geometry: `primitive: box; width: ${C}; height: ${C}; depth: ${C}`, material: 'color: #0C1628; metalness: 0.3' });
      const cara = crearEntidad(el, { lienzo: `ancho: ${C - 0.01}; alto: ${C - 0.01}`, position: `0 0 ${C / 2 + 0.002}` });
      el.addEventListener('mouseenter', () => el.object3D.scale.setScalar(1.12));
      el.addEventListener('mouseleave', () => el.object3D.scale.setScalar(1));
      el.addEventListener('click', () => this.presionar('cubo', i));
      this.botones.juego.push(el);
      return { el, cara, etiqueta: '', casa: new THREE.Vector3(), usado: false };
    });

    // la variable que guarda lo que regresa (una caja a la derecha) y la pantalla de los print
    this.caja = crearEntidad(this.el, { position: '1.5 1.32 -1.3', rotation: '0 -50 0', visible: false });
    crearEntidad(this.caja, { geometry: 'primitive: box; width: 0.5; height: 0.3; depth: 0.36', material: 'color: #2F6FBF; opacity: 0.55; transparent: true' });
    this.cajaEtiqueta = crearEntidad(this.caja, { lienzo: 'ancho: 0.8; alto: 0.2', position: '0 0.3 0' });
    this.pantallaEl = crearEntidad(this.el, { lienzo: 'ancho: 1.15; alto: 0.62', position: '1.35 2.45 -1.95', rotation: '0 -34 0' });

    // el cubo que sale de la máquina con lo que regresa
    this.salida = crearEntidad(this.el, { visible: false });
    crearEntidad(this.salida, { geometry: `primitive: box; width: ${C}; height: ${C}; depth: ${C}`, material: 'color: #0C1628; metalness: 0.3' });
    this.salidaCara = crearEntidad(this.salida, { lienzo: `ancho: ${C - 0.01}; alto: ${C - 0.01}`, position: `0 0 ${C / 2 + 0.002}` });

    this.dibujarInicio();
    this.dibujarMaquina();
    this.dibujarPantallaPrint();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false && b.object3D.visible));
    });
    refrescarApuntadores();
  },

  // --- lógica ---

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.animaciones.length || this.paso === 'final' || this.paso === 'trabajando') return null;
      if (accion === 'cubo' && this.paso === 'parametros') this.tomarCubo(Number(valor));
      if (accion === 'hueco' && this.paso === 'parametros') this.ponerEnHueco(Number(valor));
      if (accion === 'respuesta') this.responder(Number(valor));
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste la llamada');
        this.nuevoReto();
      }
    }
    return null;
  },

  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const i = 'ABCD'.indexOf(e.key.toUpperCase());
    if (i >= 0) this.presionar('respuesta', i);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.resueltos = 0;
    this.usados = new Set();
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevoReto();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Díctenle el programa al equipo', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  nuevoReto() {
    this.nivel = Math.min(3, 1 + Math.floor(this.resueltos / CONFIG.retosPorNivel));
    let lista = this.banco.filter((r, i) => r.nivel === this.nivel && !this.usados.has(i));
    if (!lista.length) {
      this.usados.clear();
      lista = this.banco.filter((r) => r.nivel === this.nivel);
    }
    this.reto = barajar(lista)[0];
    this.usados.add(this.banco.indexOf(this.reto));
    this.llenos = this.reto.parametros.map(() => null);
    this.seleccion = null;
    this.paso = 'parametros';
    this.respuesta = null;
    this.mostrarPantallaPrint = false;
    this.valorCaja = null;
    this.animaciones = [];
    // cubos revueltos alrededor
    const etiquetas = barajar(this.reto.cubos.slice());
    const lugares = barajar(LUGARES_CUBO.slice());
    this.cubos.forEach((c, i) => {
      const etiqueta = etiquetas[i];
      c.usado = false;
      c.el.setAttribute('visible', etiqueta !== undefined);
      if (etiqueta === undefined) return;
      c.etiqueta = etiqueta;
      const rad = THREE.MathUtils.degToRad(lugares[i].a);
      c.casa.set(Math.sin(rad) * CONFIG.radioCubos, lugares[i].y, -Math.cos(rad) * CONFIG.radioCubos);
      c.el.object3D.position.copy(c.casa);
      c.el.object3D.rotation.set(0, -rad, 0);
      c.el.object3D.scale.setScalar(1);
    });
    // un hueco por parámetro
    const n = this.reto.parametros.length;
    this.huecos.forEach((z, k) => {
      z.setAttribute('visible', k < n);
      z.object3D.position.x = (k - (n - 1) / 2) * 0.42;
    });
    // la variable que guarda el resultado
    const variable = !['print', 'nada'].includes(this.reto.destino);
    this.caja.setAttribute('visible', variable);
    this.salida.setAttribute('visible', false);
    this.opciones.forEach((b) => b.setAttribute('visible', false));
    this.mostrar(this.pantalla);
    this.dibujarTodo();
  },

  tomarCubo(i) {
    if (this.cubos[i].usado) return;
    this.seleccion = i;
    sonido.tecla();
    this.avisar(`Tienes el cubo ${this.cubos[i].etiqueta}: apunta al parámetro donde va`, COLOR.acento);
    this.dibujarCubos();
  },

  ponerEnHueco(k) {
    const p = this.reto.parametros[k];
    if (this.llenos[k] !== null) return;
    if (this.seleccion === null) {
      this.avisar('Primero toma un cubo con un valor (a tu izquierda)', COLOR.acento);
      return;
    }
    const cubo = this.cubos[this.seleccion];
    if (cubo.etiqueta !== p.valor) {
      this.errores += 1;
      this.seleccion = null;
      const orden = ['primer', 'segundo', 'tercer'][k];
      this.bloquear(`${p.nombre} recibe el ${orden} valor de la llamada: ${p.fuente}${p.fuente !== p.valor ? ` (vale ${p.valor})` : ''}`);
      this.dibujarCubos();
      return;
    }
    // el cubo vuela al hueco
    cubo.usado = true;
    this.seleccion = null;
    sonido.bien();
    const M = CONFIG.maquina;
    const destino = new THREE.Vector3(M.x + this.huecos[k].object3D.position.x, M.y - 0.08, M.z + M.fondo / 2 + 0.12);
    this.animar(cubo.el.object3D, cubo.casa.clone(), destino, 500, () => {
      cubo.el.setAttribute('visible', false);
      this.llenos[k] = p.valor;
      this.dibujarMaquina();
      if (this.llenos.every((v) => v !== null)) this.trabajar();
    });
    cubo.el.object3D.rotation.set(0, 0, 0);
    this.dibujarCubos();
  },

  /** Todos los parámetros listos: +1 y la máquina trabaja. */
  trabajar() {
    this.puntaje += 1;
    this.avisar(`¡Parámetros correctos! · +1 · ${this.reto.parametros.map((p) => `${p.nombre} = ${p.valor}`).join(', ')}`, COLOR.bien);
    this.paso = 'trabajando';
    this.trabajandoHasta = performance.now() + 1300;
    sonido.nivel();
    this.dibujarTodo();
  },

  /** Pasos 2 y 3: elegir entre 4 respuestas. */
  prepararOpciones() {
    const r = this.reto;
    const correcta = this.paso === 'regresa' ? r.regresa : r.pantalla;
    const falsas = this.paso === 'regresa' ? r.regresaFalsas : r.pantallaFalsas;
    const opciones = barajar([correcta, ...falsas]);
    this.correcta = opciones.indexOf(correcta);
    this.opciones.forEach((b, i) => {
      b.setAttribute('visible', true);
      b.setAttribute('boton', { texto: `${'ABCD'[i]})  ${enUnaLinea(opciones[i])}`, elegido: false });
    });
    this.mostrar(this.pantalla);
  },

  responder(i) {
    if (this.paso !== 'regresa' && this.paso !== 'pantalla') return;
    const bien = i === this.correcta;
    const r = this.reto;
    this.opciones[this.correcta].setAttribute('boton', 'elegido', true);
    if (bien) {
      this.puntaje += 1;
      sonido.bien();
    } else {
      this.errores += 1;
    }
    if (this.paso === 'regresa') {
      const explicacion = r.regresa === 'None' ? 'sin return, la función regresa None (print solo muestra)' : `con return regresa ${r.regresa}`;
      if (bien) this.avisar(`¡Correcto! · +1 · ${explicacion}`, COLOR.bien);
      else this.bloquear(`No: ${explicacion}`);
      this.paso = 'saliendo';
      this.sacarResultado();
    } else {
      if (bien) this.avisar('¡Correcto! · +1 · así se ve la pantalla', COLOR.bien);
      else this.bloquear(`En la pantalla sale: ${enUnaLinea(r.pantalla)}`);
      this.mostrarPantallaPrint = true;
      this.resueltos += 1;
      this.paso = 'final';
      this.finalHasta = performance.now() + Math.max(CONFIG.segundosFinal, bien ? 0 : CONFIG.segundosBloqueo) * 1000;
      this.dibujarPantallaPrint();
    }
    this.dibujarBarra();
    this.dibujarInfo();
  },

  /** El cubo con lo que regresa sale de la máquina y va a su destino. */
  sacarResultado() {
    const M = CONFIG.maquina;
    const r = this.reto;
    pintar(this.salidaCara, (ctx, w, h) => pintarCubo(ctx, w, h, r.regresa, { gris: r.regresa === 'None' }));
    const desde = new THREE.Vector3(M.x + M.ancho / 2 + 0.15, M.y - M.alto / 2 + 0.2, M.z + 0.3);
    let hasta;
    if (r.destino === 'print') hasta = this.pantallaEl.object3D.position.clone();
    else if (r.destino === 'nada') hasta = new THREE.Vector3(desde.x + 0.4, 0.1, desde.z + 0.3);
    else hasta = this.caja.object3D.position.clone().add(new THREE.Vector3(0, 0.15, 0));
    this.salida.setAttribute('visible', true);
    this.salida.object3D.rotation.set(0, -0.6, 0);
    this.animar(this.salida.object3D, desde, hasta, 1100, () => {
      if (r.destino !== 'print' && r.destino !== 'nada') this.valorCaja = r.regresa;
      this.salida.setAttribute('visible', false);
      this.paso = 'pantalla';
      this.prepararOpciones();
      this.dibujarTodo();
    });
  },

  animar(obj, desde, hasta, ms, alTerminar) {
    this.animaciones.push({ obj, desde, hasta, inicio: performance.now(), ms, alTerminar });
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(motivo, COLOR.mal);
    sonido.mal();
  },

  bloqueado() { return performance.now() < this.bloqueoHasta; },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 4500 };
    this.dibujarMensaje();
  },

  terminar() {
    sonido.fin();
    rondaComun.terminar();
    this.animaciones = [];
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('maquinas', this.puntaje, `llamadas ${this.resueltos} · nivel ${this.nivel} · errores ${this.errores}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    this.engranes.forEach((g, i) => {
      g.object3D.rotation.z = (t / (this.paso === 'trabajando' ? 180 : 1400)) * (i ? -1.4 : 1);
    });
    this.cubos.forEach((c, i) => {
      if (c.usado || this.animaciones.some((a) => a.obj === c.el.object3D)) return;
      c.el.object3D.position.y = c.casa.y + Math.sin(t / 800 + i) * 0.02;
    });
    const ahora = performance.now();
    this.animaciones = this.animaciones.filter((a) => {
      const f = Math.min(1, (ahora - a.inicio) / a.ms);
      a.obj.position.lerpVectors(a.desde, a.hasta, f);
      a.obj.position.y += Math.sin(f * Math.PI) * 0.15;
      if (f >= 1) { a.alTerminar(); return false; }
      return true;
    });
    if (this.pantalla !== 'juego') return;
    if (this.paso === 'trabajando' && ahora > this.trabajandoHasta) {
      this.paso = 'regresa';
      this.prepararOpciones();
      this.dibujarTodo();
    }
    if (this.paso === 'final' && ahora > this.finalHasta) this.nuevoReto();
    if (this.modo === 'ronda' && ahora >= this.finRonda) {
      this.terminar();
      return;
    }
    const segundo = Math.floor(ahora / 1000);
    if (segundo !== this.ultimoSegundo) {
      this.ultimoSegundo = segundo;
      this.dibujarBarra();
      rondaComun.segundo((this.finRonda - ahora) / 1000, this.modo);
      if (this.bloqueoHasta && ahora < this.bloqueoHasta + 1000) this.dibujarInfo();
      if (this.mensaje && ahora > this.mensaje.hasta) {
        this.mensaje = null;
        this.dibujarMensaje();
      }
    }
  },

  // --- dibujo ---

  dibujarTodo() {
    this.dibujarMaquina();
    this.dibujarCubos();
    this.dibujarCaja();
    this.dibujarPantallaPrint();
    this.dibujarBarra();
    this.dibujarPrograma();
    this.dibujarInfo();
    this.dibujarMensaje();
  },

  dibujarMaquina() {
    const M = CONFIG.maquina;
    pintar(this.frente, (ctx, w, h) => {
      const m = w / (M.ancho - 0.04);
      ctx.fillStyle = '#0C1628';
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 8;
      ctx.strokeStyle = this.paso === 'trabajando' ? COLOR.bien : 'rgba(90,169,255,.6)';
      ctx.strokeRect(4, 4, w - 8, h - 8);
      if (!this.reto) {
        texto(ctx, 'LA MÁQUINA', w / 2, h * 0.4, { tam: 96, peso: 700, alinear: 'center' });
        texto(ctx, 'DE FUNCIONES', w / 2, h * 0.6, { tam: 96, peso: 700, color: COLOR.acento, alinear: 'center' });
        return;
      }
      pintarPython(ctx, this.reto.firma, 50, h * 0.14, 64, { max: w - 100 });
      texto(ctx, this.paso === 'trabajando' ? 'TRABAJANDO…' : 'PARÁMETROS', w / 2, h * 0.3, { tam: 40, peso: 600, color: this.paso === 'trabajando' ? COLOR.bien : COLOR.tenue, alinear: 'center' });
      this.reto.parametros.forEach((p, k) => {
        const cx = w / 2 + this.huecos[k].object3D.position.x * m;
        const cy = h / 2 + 0.08 * m;
        const lado = 0.3 * m;
        rectRedondo(ctx, cx - lado * 0.6, cy - lado / 2, lado * 1.2, lado, 18);
        ctx.fillStyle = this.llenos[k] !== null ? '#13284A' : (this.encima === k ? 'rgba(90,169,255,.3)' : 'rgba(90,169,255,.08)');
        ctx.fill();
        ctx.setLineDash(this.llenos[k] !== null ? [] : [16, 10]);
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.llenos[k] !== null ? COLOR.bien : COLOR.acento;
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.llenos[k] !== null) texto(ctx, this.llenos[k], cx, cy + 4, { tam: 64, peso: 600, color: COLOR_PY.numero, alinear: 'center', fuente: MONO });
        texto(ctx, p.nombre, cx, cy + lado * 0.5 + 44, { tam: 46, peso: 600, color: COLOR.acento, alinear: 'center', fuente: MONO });
      });
      texto(ctx, 'regresa →', w - 40, h * 0.9, { tam: 38, color: COLOR.tenue, alinear: 'right' });
    });
  },

  dibujarCubos() {
    this.cubos.forEach((c, i) => {
      if (!c.etiqueta) return;
      pintar(c.cara, (ctx, w, h) => pintarCubo(ctx, w, h, c.etiqueta, { elegido: this.seleccion === i }));
    });
  },

  dibujarCaja() {
    const r = this.reto;
    if (!r) return;
    pintar(this.cajaEtiqueta, (ctx, w, h) => {
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 20);
      ctx.fillStyle = 'rgba(6,8,13,.9)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = COLOR.acento;
      ctx.stroke();
      pintarPython(ctx, `${r.destino} = ${this.valorCaja === null ? '?' : this.valorCaja}`, 30, h / 2 + 2, 64, { max: w - 60 });
    });
  },

  dibujarPantallaPrint() {
    pintar(this.pantallaEl, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#06080D');
      texto(ctx, 'PANTALLA', 40, 46, { tam: 34, peso: 600, color: COLOR.tenue, fuente: MONO });
      if (!this.reto || !this.mostrarPantallaPrint) {
        texto(ctx, '_', 40, 120, { tam: 60, color: COLOR.bien, fuente: MONO });
        return;
      }
      const lineas = this.reto.pantalla === '(nada)' ? [] : this.reto.pantalla.split('\n');
      if (!lineas.length) texto(ctx, '(no se imprime nada)', 40, 120, { tam: 48, color: COLOR.tenue });
      lineas.slice(0, 5).forEach((l, i) => texto(ctx, l, 40, 120 + i * 80, { tam: 66, peso: 600, color: COLOR.bien, fuente: MONO }));
    });
  },

  dibujarPrograma() {
    pintar(this.lienzoPrograma, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#0A1220');
      if (!this.reto) return;
      texto(ctx, 'EL PROGRAMA (díctalo)', 30, 34, { tam: 28, peso: 600, color: COLOR.tenue });
      const lineas = this.reto.lineas;
      const tam = Math.min(44, (h - 80) / (lineas.length * 1.35));
      lineas.forEach((l, i) => {
        const y = 80 + i * tam * 1.35 + tam / 2;
        if (i === this.reto.linea) {
          ctx.fillStyle = 'rgba(90,169,255,.15)';
          ctx.fillRect(16, y - tam * 0.65, w - 32, tam * 1.3);
        }
        pintarPython(ctx, l, 30, y, tam, { max: w - 60 });
      });
    });
  },

  dibujarInfo() {
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (!this.reto) return;
      const r = this.reto;
      const titulos = {
        parametros: ['PASO 1 DE 3', '¿Qué recibe', 'cada parámetro?', 'Mete cada cubo en su lugar'],
        trabajando: ['PASO 1 DE 3', '¡Listo!', 'La máquina trabaja…', ''],
        regresa: ['PASO 2 DE 3', '¿Qué regresa', `${r.llamada}?`, 'Elige abajo'],
        saliendo: ['PASO 2 DE 3', 'Sale lo que', 'regresa…', ''],
        pantalla: ['PASO 3 DE 3', '¿Qué sale en', 'la pantalla?', 'Elige abajo'],
        final: ['LLAMADA TERMINADA', 'Revisen la pantalla', 'y la variable', ''],
      }[this.paso] || ['', '', '', ''];
      texto(ctx, titulos[0], 30, 34, { tam: 28, peso: 600, color: COLOR.tenue });
      texto(ctx, titulos[1], 30, h * 0.36, { tam: 48, peso: 700 });
      texto(ctx, titulos[2], 30, h * 0.58, { tam: 48, peso: 700, color: this.paso === 'regresa' ? COLOR.acento : COLOR.texto, fuente: this.paso === 'regresa' ? MONO : undefined });
      texto(ctx, titulos[3], 30, h * 0.84, { tam: 32, color: COLOR.acento });
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 60, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s`, w / 2, h * 0.68, { tam: 44, alinear: 'center' });
      }
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON · TC1037', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'La máquina de funciones', w / 2, h * 0.25, { tam: 86, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves el programa y la máquina; el equipo tiene el código de la función.', w / 2, h * 0.43, { tam: 34, color: COLOR.tenue, alinear: 'center' });
      ['1. ¿Qué recibe? Mete cada cubo en su parámetro.', '2. ¿Qué regresa? (sin return, regresa None)', '3. ¿Qué sale en la pantalla? (print solo muestra)']
        .forEach((p, i) => texto(ctx, p, w * 0.08, h * (0.58 + i * 0.13), { tam: 40, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, `LA MÁQUINA DE FUNCIONES · NIVEL ${this.nivel || 1}`, 30, h / 2, { tam: 38, peso: 700 });
      texto(ctx, `Pasos: ${this.puntaje || 0}`, w * 0.7, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 54, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 36, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'paso bien hecho' : 'pasos bien hechos',
      detalle: `Llamadas completas: ${this.resueltos} · Nivel: ${this.nivel} · Errores: ${this.errores}`,
      registro: this.registro,
    }));
  },
});
