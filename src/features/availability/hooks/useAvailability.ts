import { useCallback, useEffect, useRef, useState } from 'react'
import type { AvailabilitySlot, AvailabilitySlotInput } from '../../../domain/availability'
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  getAvailabilitySlots,
  updateAvailabilitySlot,
} from '../../../storage/availabilityRepository'

/**
 * Coordina la lista de espacios y las operaciones del repositorio.
 *
 * @returns La lista, los estados de carga y guardado, el error y las operaciones.
 */
export const useAvailability = () => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const isMounted = useRef(false)
  const isWriteInProgress = useRef(false)
  const latestReadId = useRef(0)
  const writeVersion = useRef(0)

  /**
   * Consulta los espacios y aplica únicamente el resultado de la última consulta.
   *
   * @returns Una promesa que se rechaza si falla la consulta.
   */
  const reloadSlots = useCallback(async (): Promise<void> => {
    const readId = ++latestReadId.current

    /** @returns Si la consulta aún puede actualizar el estado de esta instancia. */
    const isCurrentRead = (): boolean => isMounted.current && readId === latestReadId.current

    if (isMounted.current) {
      setError(null)
      setIsLoading(true)
    }

    try {
      do {
        const version = writeVersion.current
        const storedSlots = await getAvailabilitySlots()

        if (!isCurrentRead()) {
          return
        }

        if (version === writeVersion.current) {
          setLoadError(null)
          setSlots(storedSlots)
          return
        }
        // Una escritura se confirmó durante la lectura. Volvemos a consultar.
      } while (isCurrentRead())
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudieron cargar los espacios.'
      if (isCurrentRead()) {
        setLoadError(message)
      }
      throw new Error(message, { cause })
    } finally {
      if (isCurrentRead()) {
        setIsLoading(false)
      }
    }
  }, [])

  /** Inicia la consulta y devuelve la limpieza que invalida sus respuestas al desmontar. */
  useEffect(() => {
    isMounted.current = true

    /** Consume el rechazo de la carga inicial después de registrar el error. */
    const handleInitialLoadError = (): void => {}
    void reloadSlots().catch(handleInitialLoadError)

    /** Invalida las consultas pendientes al finalizar el efecto. */
    return () => {
      isMounted.current = false
      latestReadId.current += 1
    }
  }, [reloadSlots])

  /**
   * Ejecuta una sola escritura por vez y actualiza la lista tras su confirmación.
   *
   * @param persist - Operación que guarda el cambio en IndexedDB.
   * @param apply - Función que aplica el resultado confirmado a la lista actual.
   * @param fallbackMessage - Mensaje para errores sin una descripción disponible.
   * @returns Una promesa que se rechaza si el guardado falla o ya hay otro en curso.
   */
  const saveSlot = async <Result>(
    persist: () => Promise<Result>,
    apply: (current: AvailabilitySlot[], result: Result) => AvailabilitySlot[],
    fallbackMessage: string,
  ): Promise<void> => {
    if (isWriteInProgress.current) {
      const message = 'Ya hay un guardado en curso. Espera a que termine.'
      if (isMounted.current) {
        setError(message)
      }
      throw new Error(message)
    }

    isWriteInProgress.current = true
    if (isMounted.current) {
      setError(null)
      setIsSaving(true)
    }

    try {
      const result = await persist()
      writeVersion.current += 1

      if (isMounted.current) {
        /**
         * Aplica el cambio confirmado sobre la lista más reciente.
         *
         * @param current - Lista actual de React.
         * @returns La lista que incorpora el cambio guardado.
         */
        const applyResult = (current: AvailabilitySlot[]): AvailabilitySlot[] => apply(current, result)
        setSlots(applyResult)
      }
    } catch (cause) {
      const message = cause instanceof Error && cause.message.trim()
        ? cause.message
        : fallbackMessage
      if (isMounted.current) {
        setError(message)
      }
      throw new Error(message, { cause })
    } finally {
      isWriteInProgress.current = false
      if (isMounted.current) {
        setIsSaving(false)
      }
    }
  }

  /**
   * Guarda un espacio nuevo y lo añade a la lista.
   *
   * @param input - Datos del espacio nuevo.
   * @returns Una promesa que se resuelve tras confirmar el guardado.
   */
  const addSlot = (input: AvailabilitySlotInput): Promise<void> => saveSlot(
    /** @returns El espacio creado en IndexedDB. */
    () => createAvailabilitySlot(input),
    /**
     * Añadel espacio confirmado.
     *
     * @param current - Lista actual de espacios.
     * @param created - Espacio devuelta por el repositorio.
     * @returns La lista con el espacio nuevo.
     */
    (current, created) => [...current, created],
    'No se pudo crear el espacio.',
  )

  /**
   * Guarda los cambios de un espacio y actualiza su entrada en la lista.
   *
   * @param slot - Espacio con los cambios que se deben guardar.
   * @returns Una promesa que se resuelve tras confirmar la modificación.
   */
  const editSlot = (slot: AvailabilitySlot): Promise<void> => {
    const updatedSlot = { ...slot }

    return saveSlot(
      /** @returns La confirmación de la actualización en IndexedDB. */
      () => updateAvailabilitySlot(updatedSlot),
      /**
       * Reemplaza la entrada correspondiente en la lista.
       *
       * @param current - Lista actual de espacios.
       * @returns La lista con los cambios confirmados.
       */
      (current) => current.map(
        /**
         * Selecciona el registro que debe aparecer en la lista.
         *
         * @param item - Espacio de la lista actual.
         * @returns El espacio actualizado si coincide el identificador.
         */
        (item) => item.id === updatedSlot.id ? updatedSlot : item,
      ),
      'No se pudo editar el espacio.',
    )
  }

  /**
   * Borra un espacio de IndexedDB y lo quita de la lista.
   *
   * @param id - Identificador del espacio que se debe eliminar.
   * @returns Una promesa que se resuelve tras confirmar la eliminación.
   */
  const removeSlot = (id: string): Promise<void> => saveSlot(
    /** @returns La confirmación de la eliminación en IndexedDB. */
    () => deleteAvailabilitySlot(id),
    /**
     * Quita el espacio eliminado de la lista.
     *
     * @param current - Lista actual de espacios.
     * @returns La lista sin el espacio eliminado.
     */
    (current) => current.filter(
      /**
       * Comprueba si el espacio debe permanecer en la lista.
       *
       * @param item - Espacio de la lista actual.
       * @returns Si el espacio tiene un identificador distinto al eliminado.
       */
      (item) => item.id !== id,
    ),
    'No se pudo eliminar el espacio.',
  )

  return {
    slots,
    isLoading,
    isSaving,
    error: error ?? loadError,
    loadError,
    addSlot,
    editSlot,
    removeSlot,
    reloadSlots,
  }
}
