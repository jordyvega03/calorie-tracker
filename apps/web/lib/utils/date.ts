// La app asume una sola zona horaria fija: Guatemala (UTC-6, sin horario de
// verano). Si en el futuro hay usuarios en otras zonas, esto tendría que
// volverse un campo del perfil en vez de una constante — ver docs/progreso.md.
export const TIMEZONE = "America/Guatemala";

// Instante (Date) -> string "YYYY-MM-DD" del día calendario en Guatemala,
// sin importar en qué zona horaria corra el servidor (Node/Vercel suele
// correr en UTC). "en-CA" produce el formato ISO YYYY-MM-DD de forma nativa.
export function fechaEnGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

// Instante (Date) -> string "HH:MM:SS" en hora de Guatemala.
export function horaEnGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(fecha);
}

export function hoyGuatemala(): string {
  return fechaEnGuatemala(new Date());
}

export function horaActualGuatemala(): string {
  return horaEnGuatemala(new Date());
}

// Los últimos `n` días (incluyendo hoy) como strings "YYYY-MM-DD", en orden
// cronológico. La aritmética se hace en milisegundos UTC (TZ-independiente)
// y el resultado se formatea al calendario de Guatemala al final — así no
// importa si el servidor corre en otra zona horaria.
export function ultimosNDiasGuatemala(n: number): string[] {
  const ahora = Date.now();
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dias.push(fechaEnGuatemala(new Date(ahora - i * 24 * 60 * 60 * 1000)));
  }
  return dias;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_CORTOS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

// Día de la semana (0=domingo..6=sábado) de un "YYYY-MM-DD". Parsear con
// "T00:00:00" (sin Z) hace que JS lo interprete como medianoche local, así
// que el día de semana que resulta es una propiedad pura del calendario
// (Y-M-D) y no depende de en qué zona horaria corra el servidor.
function diaSemanaDe(fechaISO: string): number {
  return new Date(fechaISO + "T00:00:00").getDay();
}

export function diaCortoGuatemala(fechaISO: string): string {
  return DIAS_CORTOS[diaSemanaDe(fechaISO)];
}

// Los 7 días (lunes a domingo) de la semana actual en Guatemala, en orden.
// Misma técnica seno-a-UTC que ultimosNDiasGuatemala: la aritmética es en
// milisegundos desde "ahora" (TZ-independiente) y solo se convierte a
// calendario de Guatemala al formatear cada resultado.
export function semanaActualGuatemala(): string[] {
  const hoyStr = hoyGuatemala();
  const diaSemana = diaSemanaDe(hoyStr); // 0=domingo..6=sábado
  const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;

  const inicioSemana = Date.now() - diasDesdeLunes * DIA_MS;
  return Array.from({ length: 7 }, (_, i) => fechaEnGuatemala(new Date(inicioSemana + i * DIA_MS)));
}

// "YYYY-MM" del mes actual en Guatemala.
export function mesActualGuatemala(): string {
  return hoyGuatemala().slice(0, 7);
}

// Cantidad de días de un mes ("YYYY-MM"). Aritmética de calendario local
// (año/mes/día como componentes, no como instante) — no depende de la zona
// horaria del servidor: "día 0 del mes siguiente" es el último día de éste.
export function diasEnMes(mesISO: string): number {
  const [anio, mes] = mesISO.split("-").map(Number);
  return new Date(anio, mes, 0).getDate();
}

// Día de la semana (0=domingo..6=sábado) del día 1 de ese mes.
export function diaSemanaInicioMes(mesISO: string): number {
  return diaSemanaDe(`${mesISO}-01`);
}

// "YYYY-MM" del mes siguiente/anterior a uno dado.
export function mesAdyacente(mesISO: string, delta: 1 | -1): string {
  const [anio, mes] = mesISO.split("-").map(Number);
  const d = new Date(anio, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
