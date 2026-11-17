/** Fecha de inicio e intervalo local de un espacio de estudio. */
export type AvailabilitySlotInput = {
  /** Fecha local en formato YYYY-MM-DD. */
  date: string
  /** Hora local de inicio en formato HH:mm. */
  startTime: string
  /** Hora local de fin en formato HH:mm. */
  endTime: string
}

/** Espacio de estudio persistido con su identificador. */
export type AvailabilitySlot = AvailabilitySlotInput & { id: string }
