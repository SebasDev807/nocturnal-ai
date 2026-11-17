/**
 * Obtiene la fecha de hoy en el calendario local.
 *
 * @param today - Instante del que se toma la fecha local.
 * @returns La fecha local en formato YYYY-MM-DD.
 */
export const getLocalToday = (today = new Date()): string => {
  const year = String(today.getFullYear()).padStart(4, '0')
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Comprueba que el texto representa un día real con el formato esperado.
 *
 * @param value - Fecha ingresada.
 * @returns Si el formato y el día del calendario son válidos.
 */
export const isValidLocalDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
    return false
  }

  // UTC se usa solo para comprobar el calendario; la fecha guardada sigue siendo texto.
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
