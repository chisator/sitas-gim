import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fecha de hoy en Argentina como "YYYY-MM-DD".
 *
 * El servidor corre en UTC (Vercel siempre; el VPS según el host), así que
 * `new Date().setHours(0,0,0,0)` daba la medianoche UTC: a partir de las 21:00
 * hora argentina el servidor ya creía que era el día siguiente y las rutinas
 * que terminaban hoy pasaban a "finalizadas" en pleno horario pico.
 */
export function todayInArgentina(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

/**
 * ¿La rutina sigue vigente hoy? Compara como texto "YYYY-MM-DD" en vez de
 * construir objetos Date, para no depender de la zona horaria del proceso.
 * Las fechas se guardan normalizadas a mediodía UTC, así que la parte de fecha
 * del ISO ya es el día que eligió el entrenador.
 */
export function isRoutineActive(routine: { end_date?: string | null; start_date?: string | null }): boolean {
  const reference = routine.end_date || routine.start_date
  if (!reference) return false
  return String(reference).split("T")[0] >= todayInArgentina()
}
