/** Datos necesarios para registrar una actividad. */
export type ActivityInput = {
  title: string
  /** Fecha local en formato YYYY-MM-DD. */
  dueDate: string
  /** Duración total estimada en minutos enteros. */
  estimatedMinutes: number
}

/** Actividad almacenada con su identificador y estado de finalización. */
export type Activity = ActivityInput & {
  id: string
  completed: boolean
}
