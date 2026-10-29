/* Enlace VR · Python · Arma el programa (rompecabezas de código)
 *
 * Enfrente hay un editor con las líneas numeradas de un programa, vacías. Las líneas de código flotan
 * alrededor del Operador, revueltas y con algunas trampas. El Operador toma una línea, la lee en voz
 * alta (con o sin sangría) y el equipo, con el pseudocódigo del manual, le dice en qué número va.
 * Al completar el programa, el editor lo "ejecuta" y muestra el ejemplo de ejecución.
 *
 * +1 por línea bien puesta; línea en el lugar equivocado o trampa: bloqueo de 5 s. Ronda de 5 minutos.
 * Datos: js/datos_programa.js (lo genera generador/generar.py, que corre cada programa en Python).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, curso, pintarPython */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosEjecucion: 4,
  radio: 1.85,
  tarjeta: { ancho: 0.86, alto: 0.15 },
  editor: { x: 0, y: 2.02, z: -2.45, ancho: 2.2, alto: 1.4 },
};

// lugares de las tarjetas: a los lados, arriba de los ojos o fuera de la consola, nunca atrás
const LUGARES = [
  { a: -40, y: 1.38 }, { a: -40, y: 2.08 }, { a: -63, y: 1.73 }, { a: -86, y: 1.38 }, { a: -86, y: 2.08 }, { a: -63, y: 1.05 },
  { a: 40, y: 1.38 }, { a: 40, y: 2.08 }, { a: 63, y: 1.73 }, { a: 86, y: 1.38 }, { a: 86, y: 2.08 }, { a: 63, y: 1.05 },
];

const barajar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

/** Una tarjeta de código. */
function dibujarTarjeta(ctx, w, h, linea, { elegida = false, trampa = false } = {}) {
  rectRedondo(ctx, 6, 6, w - 12, h - 12, 22);
  ctx.fillStyle = elegida ? '#13284A' : '#0C1628';
  ctx.fill();
  ctx.lineWidth = elegida ? 14 : 5;
  ctx.strokeStyle = elegida ? COLOR.acento : (trampa ? 'rgba(242,244,248,.35)' : 'rgba(242,244,248,.35)');
  ctx.stroke();
  pintarPython(ctx, linea, 34, h / 2 + 2, h * 0.42, { max: w - 68 });
}

AFRAME.registerComponent('arma-programa', {
  init() {
    this.curso = curso.actual();
    this.banco = window.PROGRAMAS[this.curso].slice().sort((a, b) => a.lineas.length - b.lineas.length || a.id - b.id);
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.prog = null;
    this.seleccion = null;
    this.vuelo = null;
    this.ejecutando = null;
    this.encima = null;
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
    const consola = crearConsola(this.el);
    ['inicio', 'juego', 'fin'].forEach((n) => { this.pantallas[n] = crearEntidad(consola, { visible: false }); });

    const ini = this.pantallas.inicio;
    this.lienzoTitulo = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.5', position: '0 0.2 0' });
    this.crearBoton('inicio', 'Practicar (sin tiempo)', -0.5, -0.17, { ancho: 0.46, alto: 0.14, accion: 'practicar' });
    this.crearBoton('inicio', 'Empezar ronda · 5 min', 0.02, -0.17, { ancho: 0.5, alto: 0.14, accion: 'empezar', estilo: 'principal' });
    this.crearBoton('inicio', 'Menú de juegos', 0.53, -0.17, { ancho: 0.44, alto: 0.14, accion: 'menu' });
    this.lienzoSeguridad = crearEntidad(ini, { lienzo: 'ancho: 1.5; alto: 0.14', position: '0 -0.37 0' });

    const jue = this.pantallas.juego;
    this.lienzoBarra = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.12', position: '0 0.38 0' });
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.46', position: '0 0.07 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.08', position: '0 -0.22 0' });
    this.crearBoton('juego', 'Saltar programa', -0.4, -0.36, { ancho: 0.4, alto: 0.1, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.05, -0.36, { ancho: 0.32, alto: 0.1, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.1 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.35, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // el editor enfrente, con 8 renglones posibles (se usan los del programa)
    const E = CONFIG.editor;
    this.editorEl = crearEntidad(this.el, { lienzo: `ancho: ${E.ancho}; alto: ${E.alto}`, position: `${E.x} ${E.y} ${E.z}` });
    this.zonas = [];
    for (let n = 0; n < 8; n++) {
      const zona = crearEntidad(this.editorEl, {
        geometry: 'primitive: plane; width: 1; height: 1',
        material: 'shader: flat; transparent: true; opacity: 0; depthWrite: false',
        position: '0 0 0.01', visible: false,
      });
      zona.addEventListener('mouseenter', () => { this.encima = n; this.dibujarEditor(); });
      zona.addEventListener('mouseleave', () => { if (this.encima === n) this.encima = null; this.dibujarEditor(); });
      zona.addEventListener('click', () => this.presionar('renglon', n));
      this.botones.juego.push(zona);
      this.zonas.push(zona);
    }

    // hasta 12 tarjetas de código alrededor
    const T = CONFIG.tarjeta;
    this.tarjetas = [];
    for (let i = 0; i < 12; i++) {
      const el = crearEntidad(this.el, { lienzo: `ancho: ${T.ancho}; alto: ${T.alto}`, visible: false });
      el.addEventListener('mouseenter', () => { if (!this.vuelo) el.object3D.scale.setScalar(1.1); });
      el.addEventListener('mouseleave', () => { if (!this.vuelo || this.vuelo.i !== i) el.object3D.scale.setScalar(1); });
      el.addEventListener('click', () => this.presionar('tarjeta', i));
      const t = { el, casa: new THREE.Vector3(), linea: '', trampa: false, puesta: false };
      this.tarjetas.push(t);
      this.botones.juego.push(el);
    }

    this.dibujarInicio();
    this.dibujarEditor();
  },

  /** Alto de cada renglón y posición (en metros, dentro del editor) del renglón n. */
  renglon(n) {
    const E = CONFIG.editor;
    const total = this.prog ? this.prog.lineas.length : 8;
    const alto = Math.min(0.2, (E.alto - 0.3) / total);
    return { alto, y: E.alto / 2 - 0.22 - alto * (n + 0.5) };
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
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
      if (this.bloqueado() || this.vuelo || this.ejecutando) return null;
      if (accion === 'tarjeta') this.tomar(valor);
      if (accion === 'renglon') this.poner(valor);
      if (accion === 'saltar') {
        this.saltados += 1;
        this.bloquear('Saltaste el programa');
        this.nuevoPrograma();
      }
    }
    return null;
  },

  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 8) this.presionar('renglon', n - 1);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.armados = 0;
    this.siguiente = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.vuelo = null;
    this.ejecutando = null;
    this.prog = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevoPrograma();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Díganle al equipo el número de programa', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  /** El siguiente programa del banco (de los cortos a los largos) y sus tarjetas alrededor. */
  nuevoPrograma() {
    this.prog = this.banco[this.siguiente % this.banco.length];
    this.siguiente += 1;
    this.puestas = new Array(this.prog.lineas.length).fill(false);
    this.seleccion = null;
    const textos = barajar(this.prog.lineas.map((l) => ({ linea: l, trampa: false }))
      .concat(this.prog.trampas.map((l) => ({ linea: l, trampa: true }))));
    const lugares = barajar(LUGARES);
    this.tarjetas.forEach((t, i) => {
      const dato = textos[i];
      t.el.setAttribute('visible', Boolean(dato));
      t.puesta = false;
      if (!dato) return;
      t.linea = dato.linea;
      t.trampa = dato.trampa;
      const rad = THREE.MathUtils.degToRad(lugares[i].a);
      t.casa.set(Math.sin(rad) * CONFIG.radio, lugares[i].y, -Math.cos(rad) * CONFIG.radio);
      t.el.object3D.position.copy(t.casa);
      t.el.object3D.rotation.set(0, -rad, 0);
      t.el.object3D.scale.setScalar(1);
    });
    // zonas para apuntar, una por renglón del programa
    const E = CONFIG.editor;
    this.zonas.forEach((z, n) => {
      const visible = n < this.prog.lineas.length;
      z.setAttribute('visible', visible);
      if (!visible) return;
      const r = this.renglon(n);
      z.object3D.position.set(0.08, r.y, 0.01);
      z.object3D.scale.set(E.ancho - 0.3, r.alto * 0.92, 1);
    });
    this.mostrar(this.pantalla);
    this.redibujarTodo();
  },

  tomar(i) {
    const t = this.tarjetas[i];
    if (!this.prog || !t.el.getAttribute('visible') || t.puesta) return;
    this.seleccion = i;
    sonido.tecla();
    this.avisar('Léela en voz alta: ¿lleva sangría? ¿qué dice exactamente?', COLOR.acento);
    this.dibujarTarjetas();
    this.dibujarInfo();
  },

  poner(n) {
    if (!this.prog || n >= this.prog.lineas.length) return;
    if (this.puestas[n]) {
      this.avisar(`La línea ${n + 1} ya está escrita`, COLOR.tenue);
      return;
    }
    if (this.seleccion === null) {
      this.avisar('Primero toma una línea: voltea, apúntale y presiona el gatillo', COLOR.acento);
      return;
    }
    const t = this.tarjetas[this.seleccion];
    if (!t.trampa && this.prog.lineas[n] === t.linea) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar(`¡Línea ${n + 1} correcta! · +1`, COLOR.bien);
      const E = CONFIG.editor;
      const r = this.renglon(n);
      const destino = new THREE.Vector3(E.x + 0.08, E.y + r.y, E.z + 0.05);
      this.vuelo = { i: this.seleccion, n, inicio: performance.now(), destino };
      t.el.object3D.rotation.set(0, 0, 0);
      this.dibujarBarra();
    } else {
      this.errores += 1;
      this.temblor = { i: this.seleccion, inicio: performance.now() };
      this.seleccion = null;
      this.bloquear(t.trampa ? 'Esa línea es una trampa: no va' : `Esa línea no va en el ${n + 1}`);
      this.dibujarTarjetas();
    }
  },

  terminarVuelo() {
    const { i, n } = this.vuelo;
    this.vuelo = null;
    this.tarjetas[i].puesta = true;
    this.tarjetas[i].el.setAttribute('visible', false);
    this.puestas[n] = true;
    this.seleccion = null;
    this.mostrar(this.pantalla);
    if (this.puestas.every(Boolean)) {
      this.armados += 1;
      this.ejecutando = { hasta: performance.now() + CONFIG.segundosEjecucion * 1000 };
      this.avisar('¡Programa completo! Se ejecuta…', COLOR.bien);
      sonido.nivel();
    }
    this.redibujarTodo();
  },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
    this.dibujarInfo();
  },

  bloqueado() { return performance.now() < this.bloqueoHasta; },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    if (this.vuelo) {
      this.tarjetas[this.vuelo.i].el.object3D.position.copy(this.tarjetas[this.vuelo.i].casa);
      this.vuelo = null;
    }
    this.ejecutando = null;
    sonido.fin();
    rondaComun.terminar();
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('programa', this.puntaje, `${this.curso} · programas ${this.armados} · errores ${this.errores}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick(t) {
    const ahora = performance.now();
    this.tarjetas.forEach((tar, i) => {
      if (this.vuelo && this.vuelo.i === i) return;
      tar.el.object3D.position.y = tar.casa.y + Math.sin(t / 800 + i) * 0.02;
    });
    if (this.temblor) {
      const pasado = ahora - this.temblor.inicio;
      const tar = this.tarjetas[this.temblor.i];
      tar.el.object3D.position.x = tar.casa.x + (pasado < 600 ? Math.sin(pasado / 25) * 0.04 * (1 - pasado / 600) : 0);
      if (pasado >= 600) this.temblor = null;
    }
    if (this.pantalla !== 'juego') return;
    if (this.vuelo) {
      const f = (ahora - this.vuelo.inicio) / 550;
      const obj = this.tarjetas[this.vuelo.i].el.object3D;
      if (f < 1) {
        obj.position.lerpVectors(this.tarjetas[this.vuelo.i].casa, this.vuelo.destino, f);
        obj.scale.setScalar(1 - 0.3 * f);
      } else {
        this.terminarVuelo();
      }
    }
    if (this.ejecutando && ahora > this.ejecutando.hasta) {
      this.ejecutando = null;
      this.nuevoPrograma();
      this.avisar(`Nuevo: programa ${this.prog.id} · ${this.prog.lineas.length} líneas`, COLOR.acento);
    }
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

  redibujarTodo() {
    this.dibujarEditor();
    this.dibujarTarjetas();
    if (this.pantalla === 'juego') {
      this.dibujarBarra();
      this.dibujarInfo();
      this.dibujarMensaje();
    }
  },

  dibujarTarjetas() {
    this.tarjetas.forEach((t, i) => {
      if (!t.linea) return;
      pintar(t.el, (ctx, w, h) => dibujarTarjeta(ctx, w, h, t.linea, { elegida: this.seleccion === i }));
    });
  },

  dibujarEditor() {
    const prog = this.prog;
    const E = CONFIG.editor;
    pintar(this.editorEl, (ctx, w, h) => {
      const m = w / E.ancho; // pixeles por metro
      rectRedondo(ctx, 4, 4, w - 8, h - 8, 30);
      ctx.fillStyle = '#0A1220';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = this.ejecutando ? COLOR.bien : 'rgba(242,244,248,.25)';
      ctx.stroke();
      // barra de título del editor
      ctx.fillStyle = '#0F1D33';
      ctx.fillRect(4, 4, w - 8, 0.16 * m);
      [COLOR.mal, '#F2C14E', COLOR.bien].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(40 + i * 36, 0.08 * m + 4, 11, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!prog) {
        texto(ctx, 'ARMA EL PROGRAMA', w / 2, h * 0.45, { tam: 100, peso: 700, alinear: 'center' });
        texto(ctx, `Curso ${this.curso} · aquí aparecerá el editor`, w / 2, h * 0.6, { tam: 46, color: COLOR.tenue, alinear: 'center' });
        return;
      }
      texto(ctx, `programa_${prog.id}.py`, 150, 0.08 * m + 4, { tam: 40, peso: 600, color: COLOR.texto, fuente: MONO });
      texto(ctx, this.ejecutando ? '▶ EJECUTANDO' : `PROGRAMA ${prog.id} · ${prog.titulo}`, w - 30, 0.08 * m + 4, { tam: 36, peso: 600, color: this.ejecutando ? COLOR.bien : COLOR.tenue, alinear: 'right' });
      if (this.ejecutando) {
        // la "consola" con el ejemplo de ejecución
        texto(ctx, '>>> python ' + `programa_${prog.id}.py`, 50, 0.32 * m, { tam: 54, color: COLOR.tenue, fuente: MONO });
        prog.ejemplo.split('\n').slice(0, 7).forEach((l, i) => texto(ctx, l, 50, 0.5 * m + i * 0.15 * m, { tam: 70, peso: 600, color: COLOR.bien, fuente: MONO }));
        return;
      }
      prog.lineas.forEach((linea, n) => {
        const r = this.renglon(n);
        const cy = h / 2 - r.y * m;
        const alto = r.alto * m;
        texto(ctx, String(n + 1), 0.11 * m, cy, { tam: Math.min(56, alto * 0.6), peso: 700, color: this.puestas[n] ? COLOR.tenue : COLOR.acento, alinear: 'center', fuente: MONO });
        const x0 = 0.2 * m;
        if (this.puestas[n]) {
          pintarPython(ctx, linea, x0 + 16, cy, Math.min(74, alto * 0.5), { max: w - x0 - 60 });
        } else {
          rectRedondo(ctx, x0, cy - alto * 0.42, w - x0 - 40, alto * 0.84, 12);
          ctx.fillStyle = this.encima === n ? 'rgba(90,169,255,.25)' : 'rgba(90,169,255,.06)';
          ctx.fill();
          ctx.setLineDash([18, 12]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(90,169,255,.6)';
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });
  },

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, `ENLACE VR · PYTHON · CURSO ${this.curso}`, w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'Arma el programa', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'El equipo tiene el pseudocódigo; tú tienes las líneas de código revueltas.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Dile al equipo el número de programa.', '2. Voltea, toma una línea y léela (¿lleva sangría?).', '3. Ponla en el número que te digan. ¡Ojo con las trampas!']
        .forEach((p, i) => texto(ctx, p, w * 0.1, h * (0.58 + i * 0.13), { tam: 40, peso: 500 }));
    });
    pintar(this.lienzoSeguridad, (ctx, w, h) => {
      fondoPanel(ctx, w, h, '#102039');
      texto(ctx, 'Gira la cabeza, no te levantes · Correa del control en la muñeca', w / 2, h * 0.5, { tam: 38, alinear: 'center' });
    });
  },

  dibujarBarra() {
    pintar(this.lienzoBarra, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      texto(ctx, `ARMA EL PROGRAMA · ${this.curso}`, 30, h / 2, { tam: 40, peso: 700 });
      texto(ctx, `Líneas: ${this.puntaje}`, w * 0.68, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 56, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (this.prog) {
        texto(ctx, `Programa ${this.prog.id}`, 40, h * 0.14, { tam: 56, peso: 700, color: COLOR.acento });
        texto(ctx, `${this.prog.lineas.length} líneas · ${this.puestas.filter(Boolean).length} escritas`, w - 40, h * 0.14, { tam: 38, color: COLOR.tenue, alinear: 'right' });
      }
      texto(ctx, 'EN LA MANO', 40, h * 0.36, { tam: 30, peso: 600, color: COLOR.tenue });
      if (this.seleccion !== null) {
        rectRedondo(ctx, 40, h * 0.45, w - 80, h * 0.24, 18);
        ctx.fillStyle = '#13284A';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = COLOR.acento;
        ctx.stroke();
        pintarPython(ctx, this.tarjetas[this.seleccion].linea, 70, h * 0.57, 54, { max: w - 140 });
        texto(ctx, 'Léela al equipo y apunta al número de línea que te digan', w / 2, h * 0.84, { tam: 36, color: COLOR.texto, alinear: 'center' });
      } else {
        texto(ctx, 'nada · voltea, apúntale a una línea y presiona el gatillo', 40, h * 0.57, { tam: 40, color: COLOR.tenue });
        texto(ctx, 'Las líneas con rayitas a la izquierda llevan sangría', w / 2, h * 0.84, { tam: 34, color: COLOR.acento, alinear: 'center' });
      }
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 80, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.65, { tam: 50, alinear: 'center' });
      }
    });
  },

  dibujarMensaje() {
    pintar(this.lienzoMensaje, (ctx, w, h) => {
      if (!this.mensaje) return;
      texto(ctx, this.mensaje.texto, w / 2, h / 2, { tam: 38, peso: 600, color: this.mensaje.color, alinear: 'center' });
    });
  },

  dibujarResultado() {
    pintar(this.lienzoResultado, (ctx, w, h) => dibujarFinalRonda(ctx, w, h, {
      practica: this.modo === 'practica',
      puntaje: this.puntaje,
      unidad: this.puntaje === 1 ? 'línea bien puesta' : 'líneas bien puestas',
      detalle: `Programas completos: ${this.armados} · Errores: ${this.errores} · Saltados: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});
