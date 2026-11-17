const databaseName = 'nocturne-ia'
const databaseVersion = 1

export const activitiesStoreName = 'activities'
export const availabilityStoreName = 'availability'

let databasePromise: Promise<IDBDatabase> | undefined

/**
 * Abre la base de datos local o reutiliza la apertura compartida.
 *
 * @returns Una promesa que entrega la conexión o se rechaza si la apertura falla o queda bloqueada.
 */
export const getDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) {
    return databasePromise
  }

  let request: IDBOpenDBRequest

  try {
    request = indexedDB.open(databaseName, databaseVersion)
  } catch (cause) {
    return Promise.reject(new Error('El navegador no permitió abrir el almacenamiento local.', { cause }))
  }

  databasePromise = new Promise<IDBDatabase>(
    /**
     * Conecta los eventos de IndexedDB con la promesa de apertura.
     *
     * @param resolve - Entrega la conexión abierta.
     * @param reject - Comunica el fallo de apertura.
     */
    (resolve, reject) => {
      let isBlocked = false

      /** Crea los almacenes del esquema de la versión 1. */
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore(activitiesStoreName, { keyPath: 'id' })
        database.createObjectStore(availabilityStoreName, { keyPath: 'id' })
      }

      /** Descarta la promesa compartida y comunica el error de IndexedDB. */
      request.onerror = () => {
        databasePromise = undefined
        reject(new Error('No se pudo abrir la base de datos local.', { cause: request.error }))
      }

      /** Avisa del bloqueo y conserva la solicitud pendiente hasta que termine. */
      request.onblocked = () => {
        isBlocked = true
        reject(new Error('Cierra las otras pestañas de Nocturne-IA para permitir la actualización.'))
      }

      /** Entrega la conexión o la cierra si la apertura ya se notificó como bloqueada. */
      request.onsuccess = () => {
        const database = request.result

        if (isBlocked) {
          database.close()
          databasePromise = undefined
          return
        }

        const connectionPromise = databasePromise

        /** Libera la conexión para permitir el cambio de versión y una nueva apertura. */
        database.onversionchange = () => {
          database.close()
          databasePromise = undefined
        }

        /** Descarta la conexión si el navegador la cierra inesperadamente. */
        database.onclose = () => {
          if (databasePromise === connectionPromise) databasePromise = undefined
        }

        resolve(database)
      }
    },
  )

  return databasePromise
}
