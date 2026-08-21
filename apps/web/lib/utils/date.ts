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
