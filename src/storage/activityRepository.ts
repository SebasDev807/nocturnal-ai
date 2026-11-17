import type { Activity, ActivityInput } from '../domain/activity'
import { activitiesStoreName, getDatabase } from './database'

/**
 * Ejecuta solicitudes sobre el almacén de actividades y espera el fin de la transacción.
 *
 * @param mode - Modo de lectura o escritura de la transacción.
 * @param run - Programa las solicitudes con acceso al almacén y a la función de aborto.
 * @returns Una promesa que se resuelve al confirmarse la transacción o se rechaza si se aborta.
 */
const runActivityTransaction = async (
  mode: 'readonly' | 'readwrite',
  run: (store: IDBObjectStore, abort: (error: Error) => void) => void,
): Promise<void> => {
  const database = await getDatabase()
  let transaction: IDBTransaction

  try {
    transaction = database.transaction(activitiesStoreName, mode)
  } catch (cause) {
    throw new Error('No se pudo iniciar la transacción de actividades.', { cause })
  }

  return new Promise<void>(
    /**
     * Registra los manejadores de finalización y programa las solicitudes.
     *
     * @param resolve - Confirma que terminó la transacción.
     * @param reject - Comunica el motivo del aborto.
     */
    (resolve, reject) => {
      let abortError: Error | undefined

      /**
       * Aborta la transacción y guarda el motivo para comunicarlo al llamador.
       *
       * @param error - Motivo por el que se aborta la transacción.
       */
      const abort = (error: Error): void => {
        abortError = error
        transaction.abort()
      }

      /** Confirma que la transacción se completó. */
      transaction.oncomplete = () => resolve()

      /** Comunica el fallo de una solicitud o el aborto de la transacción. */
      transaction.onabort = () => {
        reject(abortError ?? new Error('Se interrumpió la transacción de actividades.', {
          cause: transaction.error,
        }))
      }

      try {
        run(transaction.objectStore(activitiesStoreName), abort)
      } catch (cause) {
        abort(new Error('No se pudo ejecutar la operación de actividades.', { cause }))
      }
    },
  )
}

/**
 * Guarda una actividad nueva con un identificador único y pendiente de completar.
 *
 * @param input - Título, fecha de entrega y duración estimada de la actividad.
 * @returns La actividad creada después de confirmar la escritura.
 */
export const createActivity = async (input: ActivityInput): Promise<Activity> => {
  const activity: Activity = {
    ...input,
    id: crypto.randomUUID(),
    completed: false,
  }

  await runActivityTransaction('readwrite',
    /**
     * Agrega la actividad al almacén sin sobrescribir claves existentes.
     *
     * @param store - Almacén de actividades de la transacción.
     */
    (store) => {
      store.add(activity)
    },
  )

  return activity
}

/**
 * Consulta todas las actividades guardadas.
 *
 * @returns Las actividades almacenadas, o una lista vacía si aún no hay registros.
 */
export const getActivities = async (): Promise<Activity[]> => {
  let activities: Activity[] = []

  await runActivityTransaction('readonly',
    /**
     * Solicita todos los registros del almacén.
     *
     * @param store - Almacén de actividades de la transacción.
     */
    (store) => {
      const request: IDBRequest<Activity[]> = store.getAll()

      /** Guarda el resultado de la consulta para devolverlo al finalizar la transacción. */
      request.onsuccess = () => {
        activities = request.result
      }
    },
  )

  return activities
}

/**
 * Reemplaza una actividad existente con los datos recibidos.
 *
 * @param activity - Actividad con su identificador y los datos actualizados.
 * @returns Una promesa que confirma la escritura y se rechaza si la actividad no existe.
 */
export const updateActivity = async (activity: Activity): Promise<void> => {
  const updatedActivity = { ...activity }

  await runActivityTransaction('readwrite',
    /**
     * Busca la clave y programa la escritura dentro de la misma transacción.
     *
     * @param store - Almacén de actividades de la transacción.
     * @param abort - Función que cancela la transacción con un error.
     */
    (store, abort) => {
      const request = store.getKey(updatedActivity.id)

      /** Guarda los cambios si la clave existe o aborta la transacción. */
      request.onsuccess = () => {
        if (request.result === undefined) {
          abort(new Error('La actividad que intentas actualizar no existe.'))
          return
        }

        try {
          store.put(updatedActivity)
        } catch (cause) {
          abort(new Error('No se pudo guardar la actividad actualizada.', { cause }))
        }
      }
    },
  )
}

/**
 * Elimina una actividad por su identificador.
 *
 * @param id - Identificador de la actividad que se quiere eliminar.
 * @returns Una promesa que se resuelve cuando se confirma la transacción de eliminación.
 */
export const deleteActivity = async (id: string): Promise<void> => {
  await runActivityTransaction('readwrite',
    /**
     * Solicita la eliminación del registro con la clave indicada.
     *
     * @param store - Almacén de actividades de la transacción.
     */
    (store) => {
      store.delete(id)
    },
  )
}
