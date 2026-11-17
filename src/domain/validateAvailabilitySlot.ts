import type { AvailabilitySlot, AvailabilitySlotInput } from './availability'
import { getLocalMinute, getSlotSegments, isValidLocalTime, timeToMinutes } from './availabilityTime'
import { getLocalToday, isValidLocalDate } from './localDate'

/**
 * Valida los campos, el inicio local y los cruces con otros espacios.
 *
 * @param input - Fecha e intervalo propuestos.
 * @param slots - Espacios con los que se comprueba el solapamiento.
 * @param now - Instante de referencia para decidir si el inicio ya pasó.
 * @param original - Registro original cuando se edita un espacio.
 * @returns Los errores por campo o un objeto vacío si se puede guardar.
 */
export const validateAvailabilitySlot = (
  input: AvailabilitySlotInput,
  slots: readonly AvailabilitySlot[],
  now: Date,
  original?: AvailabilitySlot,
): Partial<Record<keyof AvailabilitySlotInput, string>> => {
  const { date, startTime, endTime } = input
  const errors: Partial<Record<keyof AvailabilitySlotInput, string>> = {}

  if (!isValidLocalDate(date)) errors.date = 'Ingresa una fecha válida.'
  if (!isValidLocalTime(startTime)) errors.startTime = 'Ingresa una hora de inicio válida.'
  if (!isValidLocalTime(endTime)) errors.endTime = 'Ingresa una hora de fin válida.'
  if (errors.date || errors.startTime || errors.endTime) return errors

  if (endTime === startTime) {
    errors.endTime = 'La hora de fin debe ser distinta de la de inicio.'
    return errors
  }

  const unchanged = date === original?.date && startTime === original.startTime && endTime === original.endTime
  const today = getLocalToday(now)
  if (!unchanged && (date < today || (date === today && timeToMinutes(startTime) < getLocalMinute(now)))) {
    errors.startTime = 'El espacio debe comenzar a partir de la fecha y hora actuales.'
    return errors
  }

  const segments = getSlotSegments(input)
  for (const slot of slots) {
    if (slot.id === original?.id) continue

    const overlaps = getSlotSegments(slot).some((existing) => segments.some((proposed) =>
      existing.date === proposed.date
      && existing.startMinute < proposed.endMinute
      && existing.endMinute > proposed.startMinute,
    ))
    if (overlaps) {
      errors.startTime = 'Este horario se solapa con otro espacio.'
      break
    }
  }
  return errors
}
