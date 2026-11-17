import type { AvailabilitySlot, AvailabilitySlotInput } from '../domain/availability'
import { validateAvailabilitySlot } from '../domain/validateAvailabilitySlot'
import { availabilityStoreName, getDatabase } from './database'

/**
 * Ejecuta solicitudes del almacén y espera la confirmación de la transacción.
 *
 * @param mode - Modo de acceso al almacén.
 * @param run - Programa las solicitudes y entrega el resultado de la operación.
 * @returns El resultado confirmado o un rechazo si la transacción se aborta.
 */
const runAvailabilityTransaction = async <Result>(
  mode: 'readonly' | 'readwrite',
  run: (store: IDBObjectStore, finish: (value: Result) => void, abort: (error: Error) => void) => void,
): Promise<Result> => {
  const database = await getDatabase()
  let transaction: IDBTransaction
  try {
    transaction = database.transaction(availabilityStoreName, mode)
  } catch (cause) {
    throw new Error('No se pudo abrir el almacén de disponibilidad.', { cause })
  }

  return new Promise<Result>(
    /**
     * Registra los eventos de confirmación y programa la operación.
     *
     * @param resolve - Entrega el resultado confirmado.
     * @param reject - Entrega el error del aborto.
     */
    (resolve, reject) => {
      let result: Result
      let failure: Error | undefined

      /**
       * Prepara el resultado para la confirmación de la transacción.
       *
       * @param value - Resultado de la operación.
       */
      const finish = (value: Result): void => { result = value }

      /**
       * Guarda el motivo explícito y cancela la transacción.
       *
       * @param error - Motivo de la cancelación.
       */
      const abort = (error: Error): void => {
        failure = error
        transaction.abort()
      }

      /** Entrega el resultado una vez confirmada la transacción. */
      transaction.oncomplete = () => resolve(result)
      /** Comunica el error de validación, solicitud o aborto. */
      transaction.onabort = () => reject(failure ?? new Error(
        'No se pudo completar la operación de disponibilidad.', { cause: transaction.error },
      ))

      try {
        run(transaction.objectStore(availabilityStoreName), finish, abort)
      } catch (cause) {
        abort(new Error('No se pudo iniciar la operación de disponibilidad.', { cause }))
      }
    },
  )
}

/**
 * Comprueba los espacios persistidos y guarda el cambio en una sola transacción.
 *
 * @param slot - Espacio con los datos que se deben guardar.
 * @param isUpdate - Si el identificador debe existir antes de guardar.
 * @returns El espacio después de confirmar la transacción.
 */
const saveSlot = (slot: AvailabilitySlot, isUpdate: boolean): Promise<AvailabilitySlot> =>
  runAvailabilityTransaction('readwrite',
    /**
     * Consulta los espacios dentro de la transacción de escritura.
     *
     * @param store - Almacén de disponibilidad.
     * @param finish - Prepara el espacio guardado como resultado.
     * @param abort - Cancela la operación con un error.
     */
    (store, finish, abort) => {
      const request: IDBRequest<AvailabilitySlot[]> = store.getAll()

      /** Revalida con los registros vigentes antes de escribir. */
      request.onsuccess = () => {
        const slots = request.result
        const original = isUpdate ? slots.find(
          /**
           * Busca el registro que se va a editar.
           *
           * @param stored - Espacio guardado.
           * @returns Si el identificador coincide.
           */
          (stored) => stored.id === slot.id,
        ) : undefined
        if (isUpdate && !original) {
          abort(new Error('El espacio que intentas editar ya no existe.'))
          return
        }

        const errors = validateAvailabilitySlot(slot, slots, new Date(), original)
        const [message] = Object.values(errors)
        if (message) {
          abort(new Error(message))
          return
        }

        try {
          if (isUpdate) store.put(slot)
          else store.add(slot)
          finish(slot)
        } catch (cause) {
          abort(new Error('No se pudo guardar el espacio de estudio.', { cause }))
        }
      }
    },
  )

/**
 * Crea un espacio de estudio con un identificador nuevo.
 *
 * @param input - Fecha y horas del espacio.
 * @returns El espacio confirmado.
 */
export const createAvailabilitySlot = async (input: AvailabilitySlotInput): Promise<AvailabilitySlot> =>
  saveSlot({ ...input, id: crypto.randomUUID() }, false)

/**
 * Lee los espacios de estudio guardados.
 *
 * @returns Los registros que contiene el almacén.
 */
export const getAvailabilitySlots = (): Promise<AvailabilitySlot[]> =>
  runAvailabilityTransaction('readonly',
    /**
     * Solicita los espacios y prepara el resultado al recibirlos.
     *
     * @param store - Almacén de disponibilidad.
     * @param finish - Registra los espacios leídos.
     */
    (store, finish) => {
      const request: IDBRequest<AvailabilitySlot[]> = store.getAll()
      /** Prepara la lista devuelta por IndexedDB. */
      request.onsuccess = () => finish(request.result)
    },
  )

/**
 * Actualiza un espacio que ya existe.
 *
 * @param slot - Espacio con su identificador y los cambios.
 * @returns Una promesa que confirma la actualización.
 */
export const updateAvailabilitySlot = async (slot: AvailabilitySlot): Promise<void> => {
  await saveSlot({ ...slot }, true)
}

/**
 * Elimina un espacio por su clave.
 *
 * @param id - Identificador del espacio.
 * @returns Una promesa que confirma la eliminación.
 */
export const deleteAvailabilitySlot = (id: string): Promise<void> =>
  runAvailabilityTransaction('readwrite',
    /**
     * Programa la eliminación en el almacén.
     *
     * @param store - Almacén de disponibilidad.
     */
    (store) => { store.delete(id) },
  )
