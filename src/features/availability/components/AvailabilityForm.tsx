import { useState, type FormEvent } from 'react'
import type { AvailabilitySlot, AvailabilitySlotInput } from '../../../domain/availability'
import { validateAvailabilitySlot } from '../../../domain/validateAvailabilitySlot'

type AvailabilityFormProps = {
  slot?: AvailabilitySlot
  slots: readonly AvailabilitySlot[]
  isSaving: boolean
  onSave: (input: AvailabilitySlotInput) => Promise<void>
  onCancel: () => void
}

const fields = [
  { name: 'date', label: 'Fecha', type: 'date' },
  { name: 'startTime', label: 'Hora de inicio', type: 'time' },
  { name: 'endTime', label: 'Hora de fin', type: 'time' },
] as const

/**
 * Presenta el formulario de creación o edición de un espacio.
 *
 * @param props - Datos, bloqueo de escritura y acciones del formulario.
 * @returns El formulario con errores asociados a los campos.
 */
export const AvailabilityForm = ({ slot, slots, isSaving, onSave, onCancel }: AvailabilityFormProps) => {
  const [errors, setErrors] = useState<ReturnType<typeof validateAvailabilitySlot>>({})

  /**
   * Valida el horario con el reloj actual antes de solicitar el guardado.
   *
   * @param event - Envío del formulario.
   * @returns Una promesa que termina después del intento de guardado.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (isSaving) return

    const form = event.currentTarget
    const values = new FormData(form)
    const input = {
      date: String(values.get('date') ?? ''),
      startTime: String(values.get('startTime') ?? ''),
      endTime: String(values.get('endTime') ?? ''),
    }
    const nextErrors = validateAvailabilitySlot(input, slots, new Date(), slot)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await onSave(input)
      form.reset()
    } catch {
      // El hook muestra el fallo y el formulario conserva los valores.
    }
  }

  /**
   * Presenta un campo de fecha u hora junto con su mensaje de validación.
   *
   * @param field - Nombre, etiqueta y tipo del campo.
   * @returns El campo etiquetado.
   */
  const renderField = ({ name, label, type }: (typeof fields)[number]) => {
    const id = `availability-${name}`
    const error = errors[name]

    return (
      <div key={name}>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <input id={id} name={name} type={type} required defaultValue={slot?.[name]}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 scheme-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 aria-invalid:border-rose-400 disabled:opacity-60" />
        {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="availability-form-title"
      className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
      <h3 id="availability-form-title" className="text-lg font-semibold">
        {slot ? 'Editar espacio' : 'Nuevo espacio'}
      </h3>
      <fieldset disabled={isSaving} className="mt-5 min-w-0 space-y-4">
        {fields.map(renderField)}
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-60">
            {isSaving ? 'Guardando…' : slot ? 'Guardar cambios' : 'Registrar espacio'}
          </button>
          {slot && <button type="button" onClick={onCancel}
            className="rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-300">
            Cancelar edición
          </button>}
        </div>
      </fieldset>
    </form>
  )
}
