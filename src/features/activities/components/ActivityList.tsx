import type { Activity } from '../../../domain/activity'
import { getLocalToday } from '../../../domain/localDate'

type ActivityListProps = {
  activities: Activity[]
  isSaving: boolean
  onEdit: (activity: Activity) => void
  onToggle: (activity: Activity) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

const actionClass = 'rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-50'

/**
 * Ordena las actividades pendientes primero y después por fecha límite.
 *
 * @param first - Primera actividad de la comparación.
 * @param second - Segunda actividad de la comparación.
 * @returns El orden relativo de las actividades.
 */
const compareActivities = (first: Activity, second: Activity): number =>
  Number(first.completed) - Number(second.completed) || first.dueDate.localeCompare(second.dueDate)

/**
 * Muestra las actividades y permite editar, cambiar su estado o eliminarlas.
 *
 * @param props - Actividades, estado de guardado y acciones de cada fila.
 * @returns La lista ordenada o un mensaje cuando está vacía.
 */
export const ActivityList = ({ activities, isSaving, onEdit, onToggle, onRemove }: ActivityListProps) => {
  const today = getLocalToday()
  const sortedActivities = [...activities].sort(compareActivities)

  /**
   * Ejecuta una acción de escritura y consume el rechazo que comunica el hook.
   *
   * @param action - Acción solicitada desde la lista.
   * @returns Una promesa que finaliza después de procesar la acción.
   */
  const runAction = async (action: Promise<void>): Promise<void> => {
    try {
      await action
    } catch {
      // El hook expone el error para que App lo muestre.
    }
  }

  /**
   * Renderiza una actividad con su estado y acciones.
   *
   * @param activity - Actividad que se muestra en la fila.
   * @returns La fila de la actividad.
   */
  const renderActivity = (activity: Activity) => {
    const isOverdue = !activity.completed && activity.dueDate < today
    const status = activity.completed ? 'Completada' : isOverdue ? 'Pendiente · Vencida' : 'Pendiente'
    const toggleLabel = activity.completed ? 'Marcar como pendiente' : 'Marcar como completada'

    /** Abre esta actividad en el formulario de edición. */
    const handleEdit = () => onEdit(activity)

    /** Solicita el cambio de estado de la actividad. */
    const handleToggle = () => {
      void runAction(onToggle(activity))
    }

    /** Pide confirmación antes de eliminar la actividad. */
    const handleRemove = () => {
      if (window.confirm(`¿Eliminar la actividad «${activity.title}»?`)) {
        void runAction(onRemove(activity.id))
      }
    }

    return (
      <li key={activity.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 wrap-break-word text-lg font-semibold">{activity.title}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isOverdue ? 'bg-rose-950 text-rose-200' : activity.completed ? 'bg-teal-950 text-teal-200' : 'bg-slate-800 text-slate-200'}`}>
            {status}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Fecha límite <time dateTime={activity.dueDate}>{activity.dueDate}</time>
          {' · '}{activity.estimatedMinutes} min
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={actionClass} disabled={isSaving} onClick={handleEdit}
            aria-label={`Editar ${activity.title}`}>Editar</button>
          <button type="button" className={actionClass} disabled={isSaving} onClick={handleToggle}
            aria-label={`${toggleLabel}: ${activity.title}`}>{toggleLabel}</button>
          <button type="button" className={`${actionClass} text-rose-200`} disabled={isSaving} onClick={handleRemove}
            aria-label={`Eliminar ${activity.title}`}>Eliminar</button>
        </div>
      </li>
    )
  }

  if (sortedActivities.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-600 p-6 text-slate-300">
      Aún no hay actividades. Usa el formulario para registrar la primera.
    </p>
  }

  return <ul className="space-y-3">{sortedActivities.map(renderActivity)}</ul>
}
