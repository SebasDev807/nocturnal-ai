import { useCallback, useEffect, useRef, useState } from 'react'
import type { Activity, ActivityInput } from '../../../domain/activity'
import {
  createActivity,
  deleteActivity,
  getActivities,
  updateActivity,
} from '../../../storage/activityRepository'

/**
 * Coordina la lista de actividades y las operaciones del repositorio.
 *
 * @returns La lista, los estados de carga y guardado, el error y las operaciones.
 */
export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const isMounted = useRef(false)
  const isWriteInProgress = useRef(false)
  const latestReadId = useRef(0)
  const writeVersion = useRef(0)

  /**
   * Consulta las actividades y aplica únicamente el resultado de la última consulta.
   *
   * @returns Una promesa que se rechaza si falla la consulta.
   */
  const reloadActivities = useCallback(async (): Promise<void> => {
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
        const storedActivities = await getActivities()

        if (!isCurrentRead()) {
          return
        }

        if (version === writeVersion.current) {
          setLoadError(null)
          setActivities(storedActivities)
          return
        }
        // Una escritura se confirmó durante la lectura. Volvemos a consultar.
      } while (isCurrentRead())
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudieron cargar las actividades.'
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
    void reloadActivities().catch(handleInitialLoadError)

    /** Invalida las consultas pendientes al finalizar el efecto. */
    return () => {
      isMounted.current = false
      latestReadId.current += 1
    }
  }, [reloadActivities])

  /**
   * Ejecuta una sola escritura por vez y actualiza la lista tras su confirmación.
   *
   * @param persist - Operación que guarda el cambio en IndexedDB.
   * @param apply - Función que aplica el resultado confirmado a la lista actual.
   * @param fallbackMessage - Mensaje para errores sin una descripción disponible.
   * @returns Una promesa que se rechaza si el guardado falla o ya hay otro en curso.
   */
  const saveActivity = async <Result>(
    persist: () => Promise<Result>,
    apply: (current: Activity[], result: Result) => Activity[],
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
        const applyResult = (current: Activity[]): Activity[] => apply(current, result)
        setActivities(applyResult)
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
   * Guarda una actividad nueva y la añade a la lista.
   *
   * @param input - Datos de la actividad nueva.
   * @returns Una promesa que se resuelve tras confirmar el guardado.
   */
  const addActivity = (input: ActivityInput): Promise<void> => saveActivity(
    /** @returns La actividad creada en IndexedDB. */
    () => createActivity(input),
    /**
     * Añade la actividad confirmada.
     *
     * @param current - Lista actual de actividades.
     * @param created - Actividad devuelta por el repositorio.
     * @returns La lista con la nueva actividad.
     */
    (current, created) => [...current, created],
    'No se pudo crear la actividad.',
  )

  /**
   * Guarda los cambios de una actividad y actualiza su entrada en la lista.
   *
   * @param activity - Actividad con los cambios que se deben guardar.
   * @returns Una promesa que se resuelve tras confirmar la modificación.
   */
  const editActivity = (activity: Activity): Promise<void> => {
    const updatedActivity = { ...activity }

    return saveActivity(
      /** @returns La confirmación de la actualización en IndexedDB. */
      () => updateActivity(updatedActivity),
      /**
       * Reemplaza la entrada correspondiente en la lista.
       *
       * @param current - Lista actual de actividades.
       * @returns La lista con los cambios confirmados.
       */
      (current) => current.map(
        /**
         * Selecciona el registro que debe aparecer en la lista.
         *
         * @param item - Actividad de la lista actual.
         * @returns La actividad actualizada si coincide el identificador.
         */
        (item) => item.id === updatedActivity.id ? updatedActivity : item,
      ),
      'No se pudo editar la actividad.',
    )
  }

  /**
   * Borra una actividad de IndexedDB y la quita de la lista.
   *
   * @param id - Identificador de la actividad que se debe eliminar.
   * @returns Una promesa que se resuelve tras confirmar la eliminación.
   */
  const removeActivity = (id: string): Promise<void> => saveActivity(
    /** @returns La confirmación de la eliminación en IndexedDB. */
    () => deleteActivity(id),
    /**
     * Quita la actividad eliminada de la lista.
     *
     * @param current - Lista actual de actividades.
     * @returns La lista sin la actividad eliminada.
     */
    (current) => current.filter(
      /**
       * Comprueba si la actividad debe permanecer en la lista.
       *
       * @param item - Actividad de la lista actual.
       * @returns Si la actividad tiene un identificador distinto al eliminado.
       */
      (item) => item.id !== id,
    ),
    'No se pudo eliminar la actividad.',
  )

  return {
    activities,
    isLoading,
    isSaving,
    error: error ?? loadError,
    loadError,
    addActivity,
    editActivity,
    removeActivity,
    reloadActivities,
  }
}
