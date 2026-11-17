import type { Activity } from './activity'
import type { AvailabilitySlot } from './availability'
import { getLocalMinute, getSlotSegments, isValidLocalTime } from './availabilityTime'
import { getLocalToday, isValidLocalDate } from './localDate'

export type StudySession = {
  activityId: string
  activityTitle: string
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
}

export type ActivityAllocation = {
  activityId: string
  title: string
  dueDate: string
  assignedMinutes: number
  remainingMinutes: number
  isOverdue: boolean
}

export type StudyPlan = {
  sessions: StudySession[]
  allocations: ActivityAllocation[]
  incompleteActivities: ActivityAllocation[]
  availableMinutes: number
  summary: {
    requiredMinutes: number
    assignedMinutes: number
    unassignedMinutes: number
  }
}

export type StudyPlanResult = { plan: StudyPlan } | { error: string }

/**
 * Prioriza las entregas próximas y desempata por identificador.
 *
 * @param first - Primera actividad.
 * @param second - Segunda actividad.
 * @returns El orden relativo de las actividades.
 */
const compareActivities = (first: Activity, second: Activity): number => {
  if (first.dueDate !== second.dueDate) return first.dueDate < second.dueDate ? -1 : 1
  if (first.id === second.id) return 0
  return first.id < second.id ? -1 : 1
}

/**
 * Convierte minutos desde medianoche al formato HH:mm.
 *
 * @param minute - Minuto local dentro del día.
 * @returns La hora formateada.
 */
const formatTime = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`

/**
 * Distribuye minutos pendientes en orden de entrega, usando los espacios en orden cronológico.
 *
 * @param activities - Actividades cargadas, incluidas las ya completadas.
 * @param slots - Espacios disponibles por fecha local.
 * @param now - Instante de referencia para descartar tiempo transcurrido.
 * @returns El plan calculado o un error de validación.
 */
export const generateStudyPlan = (
  activities: readonly Activity[],
  slots: readonly AvailabilitySlot[],
  now: Date,
): StudyPlanResult => {
  if (!Number.isFinite(now.getTime())) return { error: 'El instante de generación no es válido.' }

  const today = getLocalToday(now)
  const currentMinute = Math.ceil(getLocalMinute(now))
  const pending: Activity[] = []
  let requiredMinutes = 0

  for (const activity of activities) {
    if (activity.completed) continue
    if (!isValidLocalDate(activity.dueDate)) {
      return { error: `La actividad «${activity.title}» tiene una fecha límite inválida.` }
    }
    if (!Number.isSafeInteger(activity.estimatedMinutes) || activity.estimatedMinutes <= 0) {
      return { error: `La actividad «${activity.title}» debe tener una duración entera mayor que cero.` }
    }
    requiredMinutes += activity.estimatedMinutes
    if (!Number.isSafeInteger(requiredMinutes)) {
      return { error: 'La suma de duraciones supera el máximo de minutos admitido.' }
    }
    pending.push(activity)
  }
  pending.sort(compareActivities)

  for (const slot of slots) {
    if (!isValidLocalDate(slot.date) || !isValidLocalTime(slot.startTime)
      || !isValidLocalTime(slot.endTime) || slot.startTime === slot.endTime) {
      return { error: `Hay un espacio con fecha o intervalo inválido (${slot.date}, ${slot.startTime}–${slot.endTime}).` }
    }
  }

  const usableSlots: { date: string; nextMinute: number; endMinute: number }[] = []
  const segments = slots.flatMap(getSlotSegments)
    .sort((first, second) => first.date.localeCompare(second.date) || first.startMinute - second.startMinute)
  let previous: (typeof segments)[number] | undefined
  let availableMinutes = 0
  for (const slot of segments) {
    if (previous?.date === slot.date && slot.startMinute < previous.endMinute) {
      return { error: `Hay espacios solapados el ${slot.date}. Corrígelos antes de generar el plan.` }
    }
    previous = slot

    if (slot.date < today) continue
    const { startMinute, endMinute } = slot
    const nextMinute = slot.date === today ? Math.max(startMinute, currentMinute) : startMinute
    if (nextMinute >= endMinute) continue

    usableSlots.push({ date: slot.date, nextMinute, endMinute })
    availableMinutes += endMinute - nextMinute
  }

  const sessions: StudySession[] = []
  const allocations: ActivityAllocation[] = []
  const incompleteActivities: ActivityAllocation[] = []
  let slotIndex = 0
  let assignedMinutes = 0

  for (const activity of pending) {
    const isOverdue = activity.dueDate < today
    let remainingMinutes = activity.estimatedMinutes

    while (!isOverdue && remainingMinutes > 0 && slotIndex < usableSlots.length) {
      const slot = usableSlots[slotIndex]
      if (slot.date > activity.dueDate) break

      const durationMinutes = Math.min(remainingMinutes, slot.endMinute - slot.nextMinute)
      const endMinute = slot.nextMinute + durationMinutes
      sessions.push({
        activityId: activity.id,
        activityTitle: activity.title,
        date: slot.date,
        startTime: formatTime(slot.nextMinute),
        endTime: formatTime(endMinute),
        durationMinutes,
      })

      remainingMinutes -= durationMinutes
      slot.nextMinute = endMinute
      if (endMinute === slot.endMinute) slotIndex += 1
    }

    const allocation = {
      activityId: activity.id,
      title: activity.title,
      dueDate: activity.dueDate,
      assignedMinutes: activity.estimatedMinutes - remainingMinutes,
      remainingMinutes,
      isOverdue,
    }
    assignedMinutes += allocation.assignedMinutes
    allocations.push(allocation)
    if (remainingMinutes > 0) incompleteActivities.push(allocation)
  }

  return {
    plan: {
      sessions,
      allocations,
      incompleteActivities,
      availableMinutes,
      summary: { requiredMinutes, assignedMinutes, unassignedMinutes: requiredMinutes - assignedMinutes },
    },
  }
}
