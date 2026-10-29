/* Enlace VR · Python · El archivero (TC1038)
 *
 * Enfrente están las listas paralelas nombres y prom como dos filas de cajas, con su posición (0, 1, 2…).
 * El Operador ve los datos; el equipo tiene el código de Control Escolar (buscar, mejor, aprobados,
 * eliminar, lugar…) pero no los datos: tiene que pedirlos por posición. El Operador lee la pregunta
 * (por ejemplo print(mejor(nombres, prom))) y elige una de 4 respuestas. Al eliminar o agregar, las
 * cajas se recorren de verdad, para que se vea por qué las dos listas deben cambiar juntas.
 *
 * +1 por acierto; error o saltar: bloqueo de 5 s. Ronda de 5 minutos.
 * Preguntas: js/archivero_logica.js (comprobada contra Python por generador/generar.py).
 */
/* global AFRAME, THREE, COLOR, MONO, texto, fondoPanel, minutos, pintar, rectRedondo, sonido, crearEntidad, refrescarApuntadores, crearConsola, irA, marcador, rondaComun, dibujarFinalRonda, pintarPython, pintarBloque */

const CONFIG = {
  segundosRonda: 300,
  segundosBloqueo: 5,
  segundosExplicacion: 3.5,
  preguntasPorLista: 4,
  caja: { ancho: 0.42, alto: 0.28, fondo: 0.2, paso: 0.48 },
  filas: { nombres: 2.02, prom: 1.66 },
  z: -2.0,
  msMovimiento: 700,
};

const L = window.ArchiveroLogica;

/** Una caja: cubo azul marino con el valor escrito al frente. */
function crearCaja(padre) {
  const C = CONFIG.caja;
  const el = crearEntidad(padre, {});
  crearEntidad(el, { geometry: `primitive: box; width: ${C.ancho}; height: ${C.alto}; depth: ${C.fondo}`, material: 'color: #13233D; roughness: 0.6; metalness: 0.3' });
  const cara = crearEntidad(el, { lienzo: `ancho: ${C.ancho - 0.02}; alto: ${C.alto - 0.02}`, position: `0 0 ${C.fondo / 2 + 0.002}` });
  return { el, cara };
}

AFRAME.registerComponent('archivero', {
  init() {
    this.pantalla = '';
    this.pantallas = {};
    this.botones = { inicio: [], juego: [], fin: [] };
    this.ultimoSegundo = null;
    this.q = null;
    this.cajas = []; // { nombre: {el, cara}, prom: {el, cara}, x, xMeta, salida }
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
    this.lienzoInfo = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.34', position: '0 0.2 0' });
    this.lienzoMensaje = crearEntidad(jue, { lienzo: 'ancho: 1.5; alto: 0.07', position: '0 -0.005 0' });
    this.opciones = [0, 1, 2, 3].map((i) => this.crearBoton('juego', '', i % 2 ? 0.37 : -0.37, i < 2 ? -0.12 : -0.28, { ancho: 0.7, alto: 0.13, accion: 'respuesta', valor: String(i) }));
    this.crearBoton('juego', 'Saltar', -0.4, -0.44, { ancho: 0.3, alto: 0.08, accion: 'saltar' });
    this.botonTerminar = this.crearBoton('juego', 'Terminar', 0.4, -0.44, { ancho: 0.3, alto: 0.08, accion: 'terminar' });

    const fin = this.pantallas.fin;
    this.lienzoResultado = crearEntidad(fin, { lienzo: 'ancho: 1.5; alto: 0.66', position: '0 0.12 0' });
    this.crearBoton('fin', 'Nueva ronda', -0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'nueva', estilo: 'principal' });
    this.crearBoton('fin', 'Menú de juegos', 0.33, -0.37, { ancho: 0.58, alto: 0.14, accion: 'menu' });

    // el estante: nombres de las filas, posiciones arriba y las cajas
    this.estante = crearEntidad(this.el, { position: `0 0 ${CONFIG.z}` });
    const etiquetas = crearEntidad(this.estante, { lienzo: 'ancho: 0.62; alto: 0.62', position: '-1.82 1.84 0' });
    pintar(etiquetas, (ctx, w, h) => {
      texto(ctx, 'nombres', w - 20, h * 0.21, { tam: 92, peso: 600, color: COLOR.acento, alinear: 'right', fuente: MONO });
      texto(ctx, 'prom', w - 20, h * 0.79, { tam: 92, peso: 600, color: '#7FD1C7', alinear: 'right', fuente: MONO });
    });
    this.lienzoIndices = crearEntidad(this.estante, { lienzo: 'ancho: 3.1; alto: 0.14', position: '0.1 2.27 0' });
    // repisas
    [CONFIG.filas.nombres, CONFIG.filas.prom].forEach((y) => crearEntidad(this.estante, {
      geometry: 'primitive: box; width: 3.2; height: 0.03; depth: 0.3', material: 'color: #2F6FBF; emissive: #2F6FBF; emissiveIntensity: 0.4', position: `0.1 ${y - CONFIG.caja.alto / 2 - 0.02} 0`,
    }));

    this.dibujarInicio();
  },

  mostrar(nombre) {
    this.pantalla = nombre;
    Object.entries(this.pantallas).forEach(([n, el]) => el.setAttribute('visible', n === nombre));
    Object.entries(this.botones).forEach(([n, lista]) => {
      lista.forEach((b) => b.classList.toggle('clickable', n === nombre && b.getAttribute('visible') !== false));
    });
    refrescarApuntadores();
  },

  presionar(accion, valor) {
    if (accion === 'menu') return irA('index.html');
    if (accion === 'empezar' || accion === 'practicar') {
      this.empezar(accion === 'practicar' ? 'practica' : 'ronda');
    } else if (accion === 'nueva') {
      this.mostrar('inicio');
    } else if (this.pantalla === 'juego') {
      if (accion === 'terminar') return this.terminar();
      if (this.bloqueado() || this.explicando() || this.moviendo) return null;
      if (accion === 'respuesta') this.responder(Number(valor));
      if (accion === 'saltar') {
        this.saltados += 1;
        this.explicar(false, null);
        this.bloquear('Saltaste la pregunta');
      }
    }
    return null;
  },

  teclaFisica(e) {
    if (this.pantalla !== 'juego') return;
    const i = 'ABCD'.indexOf(e.key.toUpperCase());
    const n = i >= 0 ? i : Number(e.key) - 1;
    if (n >= 0 && n < 4) this.presionar('respuesta', n);
  },

  empezar(modo) {
    this.modo = modo;
    this.puntaje = 0;
    this.errores = 0;
    this.saltados = 0;
    this.bloqueoHasta = 0;
    this.mensaje = null;
    this.explicacion = null;
    this.finRonda = performance.now() + CONFIG.segundosRonda * 1000;
    this.botonTerminar.setAttribute('visible', modo === 'practica');
    this.mostrar('juego');
    this.nuevasListas();
    this.nuevaPregunta();
    this.avisar(modo === 'practica' ? 'Práctica: sin tiempo y sin puntos para el marcador' : '¡Ya! Léanle la pregunta al equipo', COLOR.acento);
    sonido.nivel();
    rondaComun.empezar(modo);
  },

  // --- las cajas ---

  xDe(i, n) { return 0.1 + (i - (n - 1) / 2) * CONFIG.caja.paso; },

  nuevasListas() {
    this.cajas.forEach((c) => { c.nombre.el.remove(); c.prom.el.remove(); });
    this.cajas = [];
    this.datos = L.nuevosDatos(Math.random);
    this.preguntasConEstas = 0;
    this.datos.nombres.forEach((_, i) => this.cajas.push(this.nuevaCaja(this.xDe(i, this.datos.nombres.length))));
    this.pintarCajas();
  },

  nuevaCaja(x) {
    const caja = { nombre: crearCaja(this.estante), prom: crearCaja(this.estante), x, xMeta: x, y0: 0 };
    caja.nombre.el.object3D.position.set(x, CONFIG.filas.nombres, 0);
    caja.prom.el.object3D.position.set(x, CONFIG.filas.prom, 0);
    return caja;
  },

  pintarCajas() {
    const { nombres, prom } = this.datos;
    this.cajas.forEach((c, i) => {
      if (c.salida) return;
      pintar(c.nombre.cara, (ctx, w, h) => {
        ctx.fillStyle = '#0C1628';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = COLOR.acento;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        texto(ctx, `"${nombres[i]}"`, w / 2, h / 2 + 4, { tam: 64, peso: 600, color: '#F2F4F8', alinear: 'center', fuente: MONO });
      });
      pintar(c.prom.cara, (ctx, w, h) => {
        ctx.fillStyle = '#0C1628';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#7FD1C7';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        texto(ctx, L.decimal(prom[i]), w / 2, h / 2 + 4, { tam: 76, peso: 600, color: COLOR_PY_NUMERO, alinear: 'center', fuente: MONO });
      });
    });
    const n = nombres.length;
    pintar(this.lienzoIndices, (ctx, w, h) => {
      const m = w / 3.1;
      for (let i = 0; i < n; i++) {
        const x = w / 2 + (this.xDe(i, n) - 0.1) * m;
        texto(ctx, String(i), x, h / 2, { tam: 70, peso: 700, color: COLOR.tenue, alinear: 'center', fuente: MONO });
      }
    });
  },

  /** Eliminar: la caja de la posición p cae y las de la derecha se recorren a la izquierda. */
  animarEliminar(p) {
    const vieja = this.cajas[p];
    vieja.salida = performance.now();
    this.cajas.splice(p, 1);
    this.datos.nombres.splice(p, 1);
    this.datos.prom.splice(p, 1);
    this.saliendo = vieja;
    this.cajas.forEach((c, i) => { c.xMeta = this.xDe(i, this.cajas.length); });
    this.moviendo = performance.now();
    this.pintarCajas();
  },

  /** Agregar: las cajas hacen espacio y la nueva aparece al final (append). */
  animarAgregar(nombre, p) {
    this.datos.nombres.push(nombre);
    this.datos.prom.push(p);
    const n = this.datos.nombres.length;
    this.cajas.forEach((c, i) => { c.xMeta = this.xDe(i, n); });
    const nueva = this.nuevaCaja(this.xDe(n - 1, n) + 0.6);
    nueva.xMeta = this.xDe(n - 1, n);
    nueva.y0 = 0.5;
    this.cajas.push(nueva);
    this.moviendo = performance.now();
    this.pintarCajas();
  },

  // --- preguntas ---

  nuevaPregunta() {
    const n = this.datos.nombres.length;
    if (this.preguntasConEstas >= CONFIG.preguntasPorLista || n < 4 || n > 7) this.nuevasListas();
    this.preguntasConEstas += 1;
    let tipo;
    do { tipo = L.TIPOS[Math.floor(Math.random() * L.TIPOS.length)]; } while (tipo === this.ultimoTipo);
    this.ultimoTipo = tipo;
    this.q = L.pregunta({ nombres: this.datos.nombres.slice(), prom: this.datos.prom.slice() }, tipo);
    this.funcion = window.ARCHIVERO.funciones.find((f) => f.nombre === this.q.fn);
    const opciones = [this.q.correcta, ...this.q.falsas].map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    this.correcta = opciones.indexOf(this.q.correcta);
    this.opciones.forEach((b, i) => b.setAttribute('boton', { texto: `${'ABCD'[i]})  ${opciones[i]}`, elegido: false }));
    this.dibujarInfo();
  },

  responder(i) {
    const bien = i === this.correcta;
    if (bien) {
      this.puntaje += 1;
      sonido.bien();
      this.avisar('¡Correcto! · +1', COLOR.bien);
    } else {
      this.errores += 1;
      this.bloquear('Esa no es la respuesta');
    }
    this.opciones[this.correcta].setAttribute('boton', 'elegido', true);
    this.explicar(bien, i);
    this.dibujarBarra();
  },

  explicar(bien, elegida) {
    this.explicacion = { bien, elegida, hasta: performance.now() + Math.max(CONFIG.segundosExplicacion, bien ? 0 : CONFIG.segundosBloqueo) * 1000 };
    // la acción pasa de verdad en las listas, se haya acertado o no
    const a = this.q.accion;
    if (a && a.tipo === 'eliminar') this.animarEliminar(a.pos);
    if (a && a.tipo === 'agregar') this.animarAgregar(a.nombre, a.prom);
    this.dibujarInfo();
  },

  explicando() { return this.explicacion && performance.now() < this.explicacion.hasta; },

  bloquear(motivo) {
    this.bloqueoHasta = performance.now() + CONFIG.segundosBloqueo * 1000;
    this.avisar(`${motivo}: bloqueo de ${CONFIG.segundosBloqueo} segundos`, COLOR.mal);
    sonido.mal();
  },

  bloqueado() { return performance.now() < this.bloqueoHasta; },

  avisar(textoAviso, color) {
    this.mensaje = { texto: textoAviso, color, hasta: performance.now() + 2800 };
    this.dibujarMensaje();
  },

  terminar() {
    sonido.fin();
    rondaComun.terminar();
    this.explicacion = null;
    this.registro = this.modo === 'ronda'
      ? marcador.registrar('archivero', this.puntaje, `TC1038 · errores ${this.errores} · saltadas ${this.saltados}`, () => this.dibujarResultado())
      : null;
    this.dibujarResultado();
    this.mostrar('fin');
  },

  tick() {
    const ahora = performance.now();
    if (this.moviendo !== undefined && this.moviendo !== null) {
      const f = Math.min(1, (ahora - this.moviendo) / CONFIG.msMovimiento);
      const suave = f * f * (3 - 2 * f);
      this.cajas.forEach((c) => {
        const x = c.x + (c.xMeta - c.x) * suave;
        const y = c.y0 * (1 - suave);
        c.nombre.el.object3D.position.set(x, CONFIG.filas.nombres + y, 0);
        c.prom.el.object3D.position.set(x, CONFIG.filas.prom + y, 0);
      });
      if (this.saliendo) {
        const s = this.saliendo;
        s.nombre.el.object3D.position.y = CONFIG.filas.nombres - suave * 1.2;
        s.prom.el.object3D.position.y = CONFIG.filas.prom - suave * 1.2;
        s.nombre.el.object3D.position.z = suave * 0.4;
        s.prom.el.object3D.position.z = suave * 0.4;
      }
      if (f >= 1) {
        this.cajas.forEach((c) => { c.x = c.xMeta; c.y0 = 0; });
        if (this.saliendo) {
          this.saliendo.nombre.el.remove();
          this.saliendo.prom.el.remove();
          this.saliendo = null;
        }
        this.moviendo = null;
        this.pintarCajas();
      }
    }
    if (this.pantalla !== 'juego') return;
    if (this.explicacion && ahora >= this.explicacion.hasta && !this.moviendo) {
      this.explicacion = null;
      this.nuevaPregunta();
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

  dibujarInicio() {
    pintar(this.lienzoTitulo, (ctx, w, h) => {
      texto(ctx, 'ENLACE VR · PYTHON · TC1038', w / 2, h * 0.08, { tam: 34, color: COLOR.acento, peso: 600, alinear: 'center' });
      texto(ctx, 'El archivero', w / 2, h * 0.25, { tam: 92, peso: 700, alinear: 'center' });
      texto(ctx, 'Tú ves las listas nombres y prom; el equipo tiene el código.', w / 2, h * 0.43, { tam: 36, color: COLOR.tenue, alinear: 'center' });
      ['1. Lee la pregunta en voz alta.', '2. El equipo te pide datos por posición: "¿qué hay en prom[2]?"', '3. Elige la respuesta que te digan.']
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
      texto(ctx, 'EL ARCHIVERO · TC1038', 30, h / 2, { tam: 42, peso: 700 });
      texto(ctx, `Aciertos: ${this.puntaje}`, w * 0.66, h / 2, { tam: 44, peso: 700, alinear: 'center' });
      if (this.modo === 'practica') {
        texto(ctx, 'PRÁCTICA', w - 30, h / 2, { tam: 42, peso: 700, color: COLOR.acento, alinear: 'right' });
      } else {
        const restante = (this.finRonda - performance.now()) / 1000;
        texto(ctx, minutos(restante), w - 30, h / 2, { tam: 54, peso: 700, color: restante <= 30 ? COLOR.mal : COLOR.acento, alinear: 'right' });
      }
    });
  },

  dibujarInfo() {
    const ex = this.explicando() ? this.explicacion : null;
    pintar(this.lienzoInfo, (ctx, w, h) => {
      fondoPanel(ctx, w, h);
      if (!this.q) return;
      if (ex) {
        texto(ctx, `FUNCIÓN ${this.funcion.nombre}`, 36, 36, { tam: 28, peso: 600, color: COLOR.tenue });
        const lineas = this.funcion.codigo.split('\n').length;
        const tam = Math.min(34, (h - 70) / (lineas * 1.32));
        pintarBloque(ctx, this.funcion.codigo, 40, 78, tam, { max: w * 0.64 });
        texto(ctx, '→', w * 0.8, h * 0.4, { tam: 60, color: COLOR.tenue, alinear: 'center' });
        texto(ctx, this.q.correcta, w * 0.8, h * 0.6, { tam: 54, peso: 700, color: ex.bien ? COLOR.bien : COLOR.mal, alinear: 'center', fuente: MONO });
        return;
      }
      texto(ctx, '¿QUÉ IMPRIME?', 36, 36, { tam: 28, peso: 600, color: COLOR.tenue });
      texto(ctx, `Función ${this.q.fn} del manual`, w - 36, 36, { tam: 28, peso: 600, color: COLOR.acento, alinear: 'right' });
      const lineas = this.q.codigo.split('\n');
      const tam = lineas.length > 1 ? 58 : 66;
      lineas.forEach((l, i) => pintarPython(ctx, l, 50, h * 0.52 + (i - (lineas.length - 1) / 2) * tam * 1.35, tam, { max: w - 100 }));
      const restante = (this.bloqueoHasta - performance.now()) / 1000;
      if (restante > 0) {
        ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
        rectRedondo(ctx, 4, 4, w - 8, h - 8, 26);
        ctx.fill();
        texto(ctx, '¡ENLACE CAÍDO!', w / 2, h * 0.4, { tam: 76, peso: 700, color: COLOR.mal, alinear: 'center' });
        texto(ctx, `Esperen ${Math.ceil(restante)} s · nadie habla`, w / 2, h * 0.68, { tam: 46, alinear: 'center' });
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
      unidad: this.puntaje === 1 ? 'respuesta correcta' : 'respuestas correctas',
      detalle: `Errores: ${this.errores} · Saltadas: ${this.saltados}`,
      registro: this.registro,
    }));
  },
});

const COLOR_PY_NUMERO = '#F2C14E';
