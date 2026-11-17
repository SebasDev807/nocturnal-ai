import type { AvailabilitySlotInput } from './availability'
import { getLocalToday } from './localDate'

/**
 * Comprueba que la hora pertenece a un día local y usa el formato HH:mm.
 *
 * @param time - Hora que se quiere validar.
 * @returns Si la hora tiene un formato y valor válidos.
 */
export const isValidLocalTime = (time: string): boolean => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)

/**
 * Convierte una hora local válida en minutos desde la medianoche.
 *
 * @param time - Hora en formato HH:mm.
 * @returns Minutos enteros desde las 00:00.
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesPerDay = 24 * 60

/** Divide el intervalo por fecha local para usarlo en el plan y al comprobar cruces. */
export const getSlotSegments = (slot: AvailabilitySlotInput) => {
  const startMinute = timeToMinutes(slot.startTime)
  const endMinute = timeToMinutes(slot.endTime)
  if (endMinute >= startMinute) return [{ date: slot.date, startMinute, endMinute }]

  const nextDay = new Date(`${slot.date}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const nextDate = nextDay.toISOString().split('T')[0]
  const segments = [{ date: slot.date, startMinute, endMinute: minutesPerDay }]
  if (endMinute > 0) segments.push({ date: nextDate, startMinute: 0, endMinute })
  return segments
}

/**
 * Calcula la duración de un espacio, incluido un posible cruce de medianoche.
 *
 * @param slot - Espacio que se quiere medir.
 * @returns Duración en minutos enteros.
 */
export const getSlotDuration = (slot: AvailabilitySlotInput): number =>
  getSlotSegments(slot).reduce((total, segment) => total + segment.endMinute - segment.startMinute, 0)

/**
 * Expresa la hora local actual en minutos, incluida la fracción del minuto.
 *
 * @param now - Instante de referencia.
 * @returns Minutos locales desde medianoche.
 */
export const getLocalMinute = (now: Date): number =>
  now.getHours() * 60 + now.getMinutes() + (now.getSeconds() * 1000 + now.getMilliseconds()) / 60_000

/**
 * Calcula el tiempo aprovechable a partir del instante de referencia.
 *
 * @param slot - Espacio de estudio.
 * @param now - Instante local desde el que se cuenta.
 * @returns Minutos completos restantes, o cero si el espacio terminó.
 */
export const getRemainingMinutes = (slot: AvailabilitySlotInput, now: Date): number => {
  const today = getLocalToday(now)
  return getSlotSegments(slot).reduce((total, { date, startMinute, endMinute }) => {
    if (date < today) return total
    const start = date === today ? Math.max(startMinute, Math.ceil(getLocalMinute(now))) : startMinute
    return total + Math.max(0, endMinute - start)
  }, 0)
}

/**
 * Comprueba si ya se alcanzó la hora de fin.
 *
 * @param slot - Espacio de estudio.
 * @param now - Instante local desde el que se compara.
 * @returns Si el intervalo ya terminó.
 */
export const hasSlotEnded = (slot: AvailabilitySlotInput, now: Date): boolean => {
  const today = getLocalToday(now)
  const { date, endMinute } = getSlotSegments(slot).at(-1)!
  return date < today || (date === today && endMinute <= getLocalMinute(now))
}
