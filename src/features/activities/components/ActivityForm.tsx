import { useState, type SubmitEvent } from 'react'
import type { Activity, ActivityInput } from '../../../domain/activity'
import { validateActivityInput } from '../validateActivityInput'

type ActivityFormProps = {
  activity?: Activity
  isSaving: boolean
  onSave: (input: ActivityInput) => Promise<void>
  onCancel: () => void
}

const inputClass = 'mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 scheme-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 aria-invalid:border-rose-400 disabled:opacity-60'
const errorClass = 'mt-2 text-sm text-rose-300'

/**
 * Presenta los campos para registrar o editar una actividad.
 *
 * @param props - Actividad en edición, estado de guardado y acciones del formulario.
 * @returns El formulario con sus mensajes de validación.
 */
export const ActivityForm = ({ activity, isSaving, onSave, onCancel }: ActivityFormProps) => {
  const [errors, setErrors] = useState<Partial<Record<keyof ActivityInput, string>>>({})

  /**
   * Valida los campos y conserva los valores hasta que se confirma el guardado.
   *
   * @param event - Evento de envío del formulario.
   * @returns Una promesa que finaliza después de procesar el envío.
   */
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (isSaving) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const title = String(fields.get('title') ?? '').trim()
    const dueDate = String(fields.get('dueDate') ?? '')
    const estimatedMinutes = Number(fields.get('estimatedMinutes'))
    const input = { title, dueDate, estimatedMinutes }
    const nextErrors = validateActivityInput(input, activity?.dueDate)

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await onSave(input)
      form.reset()
    } catch {
      // El hook muestra el error de almacenamiento y el formulario conserva sus valores.
    }
  }

  return (
    <section aria-labelledby="activity-form-title" className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
      <h2 id="activity-form-title" className="text-xl font-semibold">
        {activity ? 'Editar actividad' : 'Nueva actividad'}
      </h2>
      <form className="mt-5" onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSaving} className="min-w-0 space-y-4">
          <div>
            <label htmlFor="activity-title" className="text-sm font-medium">Título</label>
            <input id="activity-title" name="title" type="text" required className={inputClass}
              defaultValue={activity?.title} aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'activity-title-error' : undefined} />
            {errors.title && <p id="activity-title-error" role="alert" className={errorClass}>{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="activity-date" className="text-sm font-medium">Fecha límite</label>
            <input id="activity-date" name="dueDate" type="date" required className={inputClass}
              defaultValue={activity?.dueDate} aria-invalid={Boolean(errors.dueDate)}
              aria-describedby={errors.dueDate ? 'activity-date-error' : undefined} />
            {errors.dueDate && <p id="activity-date-error" role="alert" className={errorClass}>{errors.dueDate}</p>}
          </div>
          <div>
            <label htmlFor="activity-minutes" className="text-sm font-medium">Duración estimada (minutos)</label>
            <input id="activity-minutes" name="estimatedMinutes" type="number" min="1" step="1" required
              className={inputClass} defaultValue={activity?.estimatedMinutes}
              aria-invalid={Boolean(errors.estimatedMinutes)}
              aria-describedby={errors.estimatedMinutes ? 'activity-minutes-error' : undefined} />
            {errors.estimatedMinutes && <p id="activity-minutes-error" role="alert" className={errorClass}>{errors.estimatedMinutes}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-60">
              {isSaving ? 'Guardando…' : activity ? 'Guardar cambios' : 'Crear actividad'}
            </button>
            {activity && (
              <button type="button" onClick={onCancel} className="rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-300">
                Cancelar edición
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
