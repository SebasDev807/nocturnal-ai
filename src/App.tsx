import { useState } from 'react'
import type { Activity, ActivityInput } from './domain/activity'
import { ActivityForm } from './features/activities/components/ActivityForm'
import { ActivityList } from './features/activities/components/ActivityList'
import { useActivities } from './features/activities/hooks/useActivities'
import { AvailabilitySection } from './features/availability/components/AvailabilitySection'
import { useAvailability } from './features/availability/hooks/useAvailability'
import { StudyPlanSection } from './features/studyPlan/components/StudyPlanSection'

/**
 * Coordina los datos cargados para gestionar actividades, disponibilidad y planificación.
 *
 * @returns La pantalla principal de Nocturne-IA.
 */
const App = () => {
  const { activities, isLoading, isSaving, error, loadError, addActivity, editActivity, removeActivity, reloadActivities } = useActivities()
  const availability = useAvailability()
  const [selectedActivity, setSelectedActivity] = useState<Activity>()
  let planBlockedReason: string | null = null
  if (isLoading || availability.isLoading) {
    planBlockedReason = 'Cargando actividades y disponibilidad para generar el plan…'
  } else if (loadError || availability.loadError) {
    planBlockedReason = 'Reintenta la consulta que falló antes de generar el plan.'
  } else if (isSaving || availability.isSaving) {
    planBlockedReason = 'Espera a que termine el guardado para generar el plan.'
  }

  let completedCount = 0
  for (const activity of activities) {
    if (activity.completed) completedCount += 1
  }

  /**
   * Crea o edita la actividad según la selección del formulario.
   *
   * @param input - Datos validados del formulario.
   * @returns Una promesa que finaliza después del guardado.
   */
  const handleSave = async (input: ActivityInput): Promise<void> => {
    if (selectedActivity) {
      const currentActivity = activities.find(
        /**
         * Busca el registro con el estado más reciente.
         *
         * @param activity - Actividad de la lista.
         * @returns Si coincide con la actividad en edición.
         */
        (activity) => activity.id === selectedActivity.id,
      )
      await editActivity({ ...(currentActivity ?? selectedActivity), ...input })
      setSelectedActivity(undefined)
    } else {
      await addActivity(input)
    }
  }

  /** Cierra la edición y vuelve al formulario de creación. */
  const handleCancel = () => setSelectedActivity(undefined)

  /**
   * Invierte el estado de finalización de una actividad.
   *
   * @param activity - Actividad cuyo estado cambia.
   * @returns La confirmación del guardado.
   */
  const handleToggle = (activity: Activity): Promise<void> =>
    editActivity({ ...activity, completed: !activity.completed })

  /**
   * Elimina una actividad y cierra su edición si estaba seleccionada.
   *
   * @param id - Identificador de la actividad confirmada para eliminar.
   * @returns Una promesa que finaliza después de eliminar.
   */
  const handleRemove = async (id: string): Promise<void> => {
    await removeActivity(id)
    if (selectedActivity?.id === id) setSelectedActivity(undefined)
  }

  /**
   * Vuelve a consultar las actividades y maneja el rechazo de la consulta.
   *
   * @returns Una promesa que finaliza después del intento.
   */
  const handleReload = async (): Promise<void> => {
    try {
      await reloadActivities()
    } catch {
      // El error ya está disponible en el estado del hook.
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-700 pb-7">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Nocturne-IA</h1>
          <p className="mt-2 max-w-lg text-slate-300">Organiza tus actividades de estudio y revisa tus fechas de entrega.</p>
        </header>

        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-800 bg-rose-950 p-4 text-rose-100">
            <p role="alert">{error}</p>
            <button type="button" onClick={handleReload} disabled={isLoading || isSaving}
              className="rounded-lg border border-rose-400 px-3 py-2 text-sm hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:opacity-50">
              Reintentar consulta
            </button>
          </div>
        )}

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <ActivityForm key={selectedActivity?.id ?? 'new'} activity={selectedActivity} isSaving={isSaving}
            onSave={handleSave} onCancel={handleCancel} />

          <section aria-labelledby="activity-list-title" aria-busy={isLoading}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="activity-list-title" className="text-xl font-semibold">Actividades</h2>
              <p className="text-sm text-slate-300">
                {activities.length - completedCount} pendientes <span aria-hidden="true">·</span> {completedCount} completadas
              </p>
            </div>
            {isLoading && <p role="status" className="mb-4 text-slate-300">Cargando actividades…</p>}
            {(activities.length > 0 || (!isLoading && !error)) && (
              <ActivityList activities={activities} isSaving={isSaving}
                onEdit={setSelectedActivity} onToggle={handleToggle} onRemove={handleRemove} />
            )}
          </section>
        </div>

        <AvailabilitySection availability={availability} />
        <StudyPlanSection activities={activities} slots={availability.slots} blockedReason={planBlockedReason} />
      </div>
    </main>
  )
}

export default App
