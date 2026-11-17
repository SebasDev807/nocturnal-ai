import type { AvailabilitySlot } from '../../../domain/availability'
import { getSlotDuration, hasSlotEnded } from '../../../domain/availabilityTime'

type AvailabilityListProps = {
  slots: readonly AvailabilitySlot[]
  now: Date
  isSaving: boolean
  onEdit: (slot: AvailabilitySlot) => void
  onRemove: (id: string) => Promise<void>
}

const actionClass = 'rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-50'

/**
 * Ordena dos espacios por fecha y hora inicial.
 *
 * @param first - Primer espacio.
 * @param second - Segundo espacio.
 * @returns El orden relativo de los espacios.
 */
const compareSlots = (first: AvailabilitySlot, second: AvailabilitySlot): number =>
  first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime)

/**
 * Muestra los espacios guardados y sus acciones.
 *
 * @param props - Espacios, reloj de referencia y acciones de la lista.
 * @returns La lista ordenada o el mensaje de lista vacía.
 */
export const AvailabilityList = ({ slots, now, isSaving, onEdit, onRemove }: AvailabilityListProps) => {
  /**
   * Presenta el intervalo, duración y acciones de un espacio.
   *
   * @param slot - Espacio que se muestra.
   * @returns La fila del espacio.
   */
  const renderSlot = (slot: AvailabilitySlot) => {
    const ended = hasSlotEnded(slot, now)
    const interval = `${slot.startTime}–${slot.endTime}${slot.endTime < slot.startTime ? ' (día siguiente)' : ''}`
    const label = `${slot.date}, ${interval}`

    /** Abre el espacio en el formulario. */
    const handleEdit = (): void => onEdit(slot)

    /**
     * Pide confirmación y elimina el espacio si la persona acepta.
     *
     * @returns Una promesa que finaliza después del intento de eliminación.
     */
    const handleRemove = async (): Promise<void> => {
      if (!window.confirm(`¿Eliminar el espacio del ${label}?`)) return
      try {
        await onRemove(slot.id)
      } catch {
        // El error de almacenamiento se muestra en la sección.
      }
    }

    return (
      <li key={slot.id} className={`rounded-xl border border-slate-700 p-4 sm:p-5 ${ended ? 'bg-slate-950' : 'bg-slate-900'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg font-semibold"><time dateTime={slot.date}>{slot.date}</time></h3>
          {ended && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">Pasado</span>}
        </div>
        <p className="mt-2 text-sm text-slate-300">{interval} · {getSlotDuration(slot)} min</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={actionClass} onClick={handleEdit} disabled={isSaving}
            aria-label={`Editar espacio del ${label}`}>Editar</button>
          <button type="button" className={`${actionClass} text-rose-200`} onClick={handleRemove} disabled={isSaving}
            aria-label={`Eliminar espacio del ${label}`}>Eliminar</button>
        </div>
      </li>
    )
  }

  if (slots.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-600 p-6 text-slate-300">
      Aún no hay espacios. Registra un horario que ya tengas libre para estudiar.
    </p>
  }

  return <ul className="space-y-3">{[...slots].sort(compareSlots).map(renderSlot)}</ul>
}
