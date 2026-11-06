import './style.css';
import { Musica } from './audio/musica';
import { PISTAS } from './audio/pistas';
import { ClienteByte } from './cerebro/clienteByte';
import { CONFIG } from './config';
import { Conversacion } from './conversacion';
import { EventBus } from './core/eventBus';
import type { EventosByte } from './core/eventos';
import { MaquinaEstados } from './core/maquinaEstados';
import { Hud } from './debug/hud';
import { Ojos } from './eyes/ojos';
import { Controles } from './input/controles';
import { Ocurrencias } from './ocurrencias';
import { PanelJuego } from './juego/panelJuego';
import { SeguidorJuego } from './juego/seguidorJuego';
import { esconderCursorInactivo } from './ui/cursor';
import { esperarDespertar } from './ui/despertar';
import { entrarPantallaCompleta } from './ui/pantallaCompleta';
import { Subtitulos } from './ui/subtitulos';
import { EnvolventeSintetica } from './voz/envolventeSintetica';
import { OidoWebSpeech } from './voz/oidoWebSpeech';
import { VozNavegador } from './voz/vozNavegador';

// main solo arma las piezas y las conecta entre sí a través del bus.
const app = document.querySelector<HTMLElement>('#app')!;
const bus = new EventBus<EventosByte>();
// Byte arranca dormido; se despierta con la primera tecla.
const estados = new MaquinaEstados(bus, 'durmiendo');
const ojos = new Ojos(app, bus, CONFIG.ojos, estados.actual);
const musica = new Musica(PISTAS, CONFIG.musica);
const envolvente = new EnvolventeSintetica(bus);
const cliente = new ClienteByte(CONFIG.backend);

const conversacion = new Conversacion({
  bus,
  estados,
  oido: new OidoWebSpeech(bus, CONFIG.oido),
  voz: new VozNavegador(envolvente, CONFIG.voz),
  cliente,
  seguidor: new SeguidorJuego(bus, cliente, CONFIG.juego),
});
new PanelJuego(bus, {
  teclasDeByte: [CONFIG.teclas.pushToTalk, CONFIG.teclas.cerrarJuego],
  cerrarInactivoMs: CONFIG.juego.cerrarInactivoMs,
});
new Ocurrencias(bus, (texto) => conversacion.comentar(texto), CONFIG.ocurrencias);
new Controles(bus, CONFIG.teclas);
esconderCursorInactivo(CONFIG.cursorInactivoS);
if (CONFIG.subtitulos) new Subtitulos(document.body, bus);
new Hud(document.body, bus, {
  visible: CONFIG.hudVisible,
  estadoInicial: estados.actual,
  avisos: musica.hayPistas ? [] : ['♪ no hay música en assets/musica'],
});

bus.on('estado:cambio', ({ actual }) => {
  if (CONFIG.musica.bajarEn.includes(actual)) musica.bajar();
  else musica.subir();
  if (actual !== 'hablando') envolvente.detener();
});

// Debug: forzar estados. En `hablando` los ojos rebotan con una voz simulada.
bus.on('debug:estado', (estado) => {
  estados.cambiar(estado);
  if (estado === 'hablando') envolvente.iniciar();
});

ojos.iniciar();
await esperarDespertar(document.body);
if (CONFIG.pantallaCompletaAlDespertar) entrarPantallaCompleta();
estados.cambiar('idle');
conversacion.saludar();
await musica.iniciar();
