import { useEffect, useState } from 'react'
import type { AvailabilitySlot, AvailabilitySlotInput } from '../../../domain/availability'
import { getRemainingMinutes } from '../../../domain/availabilityTime'
import type { useAvailability } from '../hooks/useAvailability'
import { AvailabilityForm } from './AvailabilityForm'
import { AvailabilityList } from './AvailabilityList'

/**
 * Coordina la selección de edición y conecta disponibilidad con la interfaz.
 *
 * @param props - Estado y operaciones de disponibilidad compartidos por la aplicación.
 * @returns La gestión de espacios de estudio.
 */
export const AvailabilitySection = ({ availability }: { availability: ReturnType<typeof useAvailability> }) => {
  const { slots, isLoading, isSaving, error, addSlot, editSlot, removeSlot, reloadSlots } = availability
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot>()
  const [now, setNow] = useState(new Date())

  /** Mantiene actualizado el total y libera el temporizador al desmontar. */
  useEffect(() => {
    /** Toma una nueva referencia del reloj local. */
    const updateClock = (): void => setNow(new Date())
    const timer = window.setInterval(updateClock, 1000)

    /** Detiene el reloj de esta sección. */
    return () => window.clearInterval(timer)
  }, [])

  let totalMinutes = 0
  for (const slot of slots) totalMinutes += getRemainingMinutes(slot, now)

  /**
   * Crea o actualiza el espacio según el modo del formulario.
   *
   * @param input - Fecha y horas validadas.
   * @returns Una promesa que confirma el guardado.
   */
  const handleSave = async (input: AvailabilitySlotInput): Promise<void> => {
    if (selectedSlot) {
      await editSlot({ ...input, id: selectedSlot.id })
      setSelectedSlot(undefined)
    } else {
      await addSlot(input)
    }
  }

  /** Vuelve al formulario de creación. */
  const handleCancel = (): void => setSelectedSlot(undefined)

  /**
   * Elimina un espacio y cierra su edición si estaba seleccionado.
   *
   * @param id - Identificador confirmado para eliminar.
   * @returns Una promesa que confirma la eliminación.
   */
  const handleRemove = async (id: string): Promise<void> => {
    await removeSlot(id)
    if (selectedSlot?.id === id) setSelectedSlot(undefined)
  }

  /**
   * Reintenta la consulta y maneja su rechazo.
   *
   * @returns Una promesa que finaliza luego del intento.
   */
  const handleReload = async (): Promise<void> => {
    try {
      await reloadSlots()
    } catch {
      // El hook expone el error para mostrarlo en esta sección.
    }
  }

  return (
    <section aria-labelledby="availability-title" className="mt-10 border-t border-slate-700 pt-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="availability-title" className="text-2xl font-semibold">Disponibilidad de estudio</h2>
        <p className="text-sm text-slate-300">
          <strong className="text-teal-200">{totalMinutes} min</strong> disponibles a partir de ahora
        </p>
      </header>

      {error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-800 bg-rose-950 p-4 text-rose-100">
          <p role="alert">{error}</p>
          <button type="button" onClick={handleReload} disabled={isLoading || isSaving}
            className="rounded-lg border border-rose-400 px-3 py-2 text-sm hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:opacity-50">
            Reintentar consulta de espacios
          </button>
        </div>
      )}

      <div className="mt-5 grid items-start gap-7 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <AvailabilityForm key={selectedSlot?.id ?? 'new'} slot={selectedSlot} slots={slots}
          isSaving={isSaving} onSave={handleSave} onCancel={handleCancel} />
        <section aria-labelledby="availability-list-title" aria-busy={isLoading}>
          <h3 id="availability-list-title" className="mb-4 text-xl font-semibold">Espacios registrados</h3>
          {isLoading && <p role="status" className="mb-4 text-slate-300">Cargando espacios de estudio…</p>}
          {(slots.length > 0 || (!isLoading && !error)) && (
            <AvailabilityList slots={slots} now={now} isSaving={isSaving}
              onEdit={setSelectedSlot} onRemove={handleRemove} />
          )}
        </section>
      </div>
    </section>
  )
}
