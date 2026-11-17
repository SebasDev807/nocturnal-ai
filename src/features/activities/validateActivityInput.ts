import type { ActivityInput } from '../../domain/activity'
import { getLocalToday, isValidLocalDate } from '../../domain/localDate'

/**
 * Valida los datos que se enviarán al repositorio.
 *
 * @param input - Datos normalizados del formulario.
 * @param originalDueDate - Fecha que puede conservarse al editar una actividad vencida.
 * @returns Los errores por campo. Un objeto vacío indica que se puede guardar.
 */
export const validateActivityInput = (
  input: ActivityInput,
  originalDueDate?: string,
): Partial<Record<keyof ActivityInput, string>> => {
  const { title, dueDate, estimatedMinutes } = input
  const errors: Partial<Record<keyof ActivityInput, string>> = {}

  if (!title.trim()) errors.title = 'Escribe un título.'
  if (!isValidLocalDate(dueDate)) {
    errors.dueDate = 'Ingresa una fecha válida en formato AAAA-MM-DD.'
  } else if (dueDate !== originalDueDate && dueDate < getLocalToday()) {
    errors.dueDate = 'Selecciona hoy o una fecha futura.'
  }
  if (!Number.isSafeInteger(estimatedMinutes) || estimatedMinutes <= 0) {
    errors.estimatedMinutes = 'Ingresa una cantidad entera de minutos mayor que cero.'
  }

  return errors
}
