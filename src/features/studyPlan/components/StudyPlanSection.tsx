import { useState } from 'react'
import type { Activity } from '../../../domain/activity'
import type { AvailabilitySlot } from '../../../domain/availability'
import {
  generateStudyPlan,
  type ActivityAllocation,
  type StudyPlan,
  type StudyPlanResult,
  type StudySession,
} from '../../../domain/studyPlan'

type StudyPlanSectionProps = {
  activities: readonly Activity[]
  slots: readonly AvailabilitySlot[]
  blockedReason: string | null
}

type GeneratedPlan = {
  activities: readonly Activity[]
  slots: readonly AvailabilitySlot[]
  generatedAt: Date
  result: StudyPlanResult
}

/**
 * Muestra una sesión de estudio generada.
 *
 * @param session - Intervalo asignado a una actividad.
 * @returns La fila con su horario y duración.
 */
const renderSession = (session: StudySession) => (
  <li key={session.startTime} className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
    <span className="font-medium text-teal-200">{session.startTime}–{session.endTime}</span>
    <span className="wrap-break-word">{session.activityTitle}</span>
    <span className="text-sm text-slate-300">{session.durationMinutes} min</span>
  </li>
)

/**
 * Muestra el tiempo que falta para terminar una actividad.
 *
 * @param allocation - Resultado de la asignación de esa actividad.
 * @returns El detalle de los minutos pendientes y la fecha límite.
 */
const renderIncompleteActivity = (allocation: ActivityAllocation) => (
  <li key={allocation.activityId} className="wrap-break-word">
    <strong>{allocation.title}</strong> · {allocation.remainingMinutes} min pendientes
    {' · '}{allocation.isOverdue ? 'Venció el' : 'Fecha límite'} <time dateTime={allocation.dueDate}>{allocation.dueDate}</time>
  </li>
)

/**
 * Presenta el resumen, las alertas y las sesiones de un plan.
 *
 * @param props - Plan calculado e instante en el que se generó.
 * @returns El resultado de la planificación.
 */
const StudyPlanDetails = ({ plan, generatedAt }: { plan: StudyPlan; generatedAt: Date }) => {
  const sessionsByDate = new Map<string, StudySession[]>()
  for (const session of plan.sessions) {
    const day = sessionsByDate.get(session.date)
    if (day) day.push(session)
    else sessionsByDate.set(session.date, [session])
  }

  const { requiredMinutes, assignedMinutes, unassignedMinutes } = plan.summary

  /**
   * Presenta un día con las sesiones en el orden del plan.
   *
   * @param entry - Fecha local y sesiones que le corresponden.
   * @returns El grupo de sesiones del día.
   */
  const renderDay = ([date, sessions]: [string, StudySession[]]) => (
    <section key={date} aria-labelledby={`study-plan-${date}`}
      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 sm:px-5">
      <h3 id={`study-plan-${date}`} className="font-semibold"><time dateTime={date}>{date}</time></h3>
      <ul className="mt-2 divide-y divide-slate-700">{sessions.map(renderSession)}</ul>
    </section>
  )

  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-slate-300">
        Generado el <time dateTime={generatedAt.toISOString()}>
          {generatedAt.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <dt className="text-sm text-slate-300">Tiempo necesario</dt>
          <dd className="mt-1 text-xl font-semibold">{requiredMinutes} min</dd>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <dt className="text-sm text-slate-300">Tiempo asignado</dt>
          <dd className="mt-1 text-xl font-semibold text-teal-200">{assignedMinutes} min</dd>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <dt className="text-sm text-slate-300">Tiempo sin asignar</dt>
          <dd className="mt-1 text-xl font-semibold">{unassignedMinutes} min</dd>
        </div>
      </dl>

      {requiredMinutes === 0 && <p className="text-slate-300">No hay actividades pendientes para planificar.</p>}
      {requiredMinutes > 0 && plan.availableMinutes === 0 && (
        <p className="text-slate-300">No hay espacios con minutos disponibles a partir de ahora.</p>
      )}
      {plan.incompleteActivities.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-700 bg-amber-950 p-4 text-amber-100">
          <h3 className="font-semibold">Tiempo insuficiente antes de las entregas</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.incompleteActivities.map(renderIncompleteActivity)}
          </ul>
        </div>
      )}
      {sessionsByDate.size > 0 && <div className="space-y-3">{Array.from(sessionsByDate, renderDay)}</div>}
    </div>
  )
}

/**
 * Genera y muestra un plan en memoria usando los datos cargados de la aplicación.
 *
 * @param props - Actividades, disponibilidad y motivo por el que se debe esperar.
 * @returns La sección de planificación con su estado actual.
 */
export const StudyPlanSection = ({ activities, slots, blockedReason }: StudyPlanSectionProps) => {
  const [generated, setGenerated] = useState<GeneratedPlan>()
  const isStale = generated !== undefined && (generated.activities !== activities || generated.slots !== slots)

  /** Captura los datos actuales y calcula el plan para ese instante. */
  const handleGenerate = (): void => {
    if (blockedReason) return
    const generatedAt = new Date()
    setGenerated({ activities, slots, generatedAt, result: generateStudyPlan(activities, slots, generatedAt) })
  }

  return (
    <section aria-labelledby="study-plan-title" className="mt-10 border-t border-slate-700 pt-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="study-plan-title" className="text-2xl font-semibold">Plan de estudio</h2>
          <p className="mt-1 text-sm text-slate-300">Planificación por reglas según tus fechas límite y espacios de estudio.</p>
        </div>
        <button type="button" onClick={handleGenerate} disabled={blockedReason !== null}
          className="rounded-lg bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-60">
          Generar plan
        </button>
      </header>

      {blockedReason && <p role="status" className="mt-4 text-sm text-slate-300">{blockedReason}</p>}
      {isStale && (
        <p role="status" className="mt-4 text-sm text-amber-200">
          Los datos del plan se actualizaron. Genera el plan de nuevo.
        </p>
      )}
      {generated && !isStale && !blockedReason && (
        'error' in generated.result
          ? <p role="alert" className="mt-4 rounded-xl border border-rose-800 bg-rose-950 p-4 text-rose-100">{generated.result.error}</p>
          : <StudyPlanDetails plan={generated.result.plan} generatedAt={generated.generatedAt} />
      )}
    </section>
  )
}
