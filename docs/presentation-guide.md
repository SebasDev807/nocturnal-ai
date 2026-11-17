# Guía de sustentación de Nocturne-IA

## A. Resumen del proyecto

**Problema.** Un estudiante que trabaja puede disponer de varias horas en una semana y, aun así, tener muy poco tiempo antes de una entrega. Revisar la carga total por sí sola puede ocultar ese problema.

**Usuario objetivo.** Estudiantes que combinan trabajo y estudio y necesitan distribuir su tiempo libre antes de las fechas de entrega.

**Entradas.** Título, fecha límite, duración estimada y estado de cada actividad. Fecha y horas de inicio y fin de cada espacio libre. El instante local de generación se captura al pulsar **Generar plan**.

**Proceso.** Los formularios validan los datos y los repositorios los guardan en IndexedDB. El planificador ordena las actividades pendientes por fecha límite y reparte sus minutos entre los espacios utilizables, sin programar sesiones después de la entrega.

**Salidas.** Sesiones agrupadas por día, resumen de minutos necesarios, asignados y sin asignar, y alertas con los minutos que faltan por actividad.

## B. Demostración de cinco minutos

Prepara un perfil separado del navegador y abre la aplicación en ese perfil con `pnpm dev`. Los datos de demostración quedarán aislados de los registros personales. Usa siempre la misma dirección durante el recorrido para conservar el mismo origen. Introduce los datos manualmente y conserva los registros personales.

El **día 1** es mañana según la fecha local de la demostración. Los días 2, 3 y 4 son los días consecutivos siguientes. Anota las cuatro fechas reales antes de empezar, incluso si cruzan un cambio de mes.

| Tiempo | Acción | Resultado esperado |
|---|---|---|
| 0:00–1:15 | Registra el día 1 de **09:00 a 14:00** y el día 2 de **09:00 a 14:00**. | Dos espacios futuros de 300 min. Total de 600 min, equivalentes a 10 h. |
| 1:15–2:15 | Crea **Preparar presentación** con **300 min**, entrega el día 3. Crea **Resolver taller** con **420 min**, entrega el día 4. | Ambas entregas son posteriores a los espacios iniciales. |
| 2:15–3:00 | Pulsa **Generar plan**. | Asigna 600 de 720 min. Faltan **120 min** del taller. |
| 3:00–4:00 | Registra un espacio adicional el día 3 de **09:00 a 11:00** y vuelve a generar. | El plan anterior se invalida. El nuevo asigna **720 min** y quedan **0 min** sin asignar. |
| 4:00–5:00 | Intenta registrar el día 2 de **10:00 a 11:00**. Muestra el mensaje de solapamiento y recarga la página. | El espacio rechazado no aparece. Las dos tareas y los tres espacios válidos siguen disponibles. Pulsa **Generar plan** de nuevo si quieres mostrar el resultado. |

## C. Relación con las fichas

Las fichas originales no están en el proyecto revisado. Esta relación sirve para orientar la explicación y debe contrastarse con los documentos académicos.

| Ficha | Qué explicar con el prototipo |
|---|---|
| 0 · Problema | La dificultad de repartir tiempo de estudio antes de las entregas cuando se combinan trabajo y estudio. |
| 1 · Sistema de información | Las entradas, su almacenamiento local, el cálculo y las salidas visibles en la aplicación. |
| 2 · Organización del desarrollo | El código permite explicar la separación entre actividades, disponibilidad, almacenamiento y planificación. Usa la ficha real para confirmar metodología, integrantes y roles. |
| 3 · Exactitud, desempeño y fiabilidad | Explica cómo se validan los datos, se comprueban fechas límite y se confirma una escritura. Los objetivos de tiempo y manejo de entradas inválidas requieren comprobación manual. |
| 4 · Algoritmo | Una comparación entre horas necesarias y disponibles resume la capacidad total. `generateStudyPlan` añade la condición decisiva de asignar cada minuto antes de la entrega que corresponda. |
| 5 · Paso al código | Relaciona entradas con los formularios, persistencia con los repositorios y cálculo con `src/domain/studyPlan.ts`. Contrasta esta relación con el contenido de la ficha real antes de presentarla. |

## D. Preguntas individuales

| Pregunta | Respuesta breve |
|---|---|
| ¿Por qué React? | Permite componer la pantalla con formularios, listados y la sección del plan. `App.tsx` les comparte el estado y las operaciones mediante props. |
| ¿Por qué IndexedDB? | Guarda registros estructurados localmente y permite operaciones asíncronas con transacciones. `src/storage/database.ts` abre los almacenes `activities` y `availability`. |
| ¿Qué diferencia hay entre estado y persistencia? | El estado de los hooks alimenta la pantalla actual. Los registros de IndexedDB permanecen al recargar y se consultan de nuevo al montar la aplicación. |
| ¿Qué responsabilidad tiene un hook? | `useActivities` y `useAvailability` coordinan carga, errores y escrituras. Delegan el acceso a IndexedDB en sus repositorios. |
| ¿Qué hace una transacción? | Agrupa operaciones del almacén que se confirman juntas o se revierten si se abortan. `availabilityRepository.ts` lee y comprueba los cruces dentro de la misma transacción que escribe el espacio. |
| ¿Por qué esperar a que termine la transacción? | Una solicitud individual puede tener éxito antes de que se confirme la escritura. Los repositorios esperan `transaction.oncomplete` antes de que los hooks actualicen las listas. |
| ¿Cómo prioriza el planificador? | `generateStudyPlan` ordena por fecha límite más cercana y desempata por identificador. Consume los espacios disponibles en orden cronológico. |
| ¿Por qué pueden faltar horas aunque el total disponible sea suficiente? | Un espacio posterior a una entrega ya no sirve para esa actividad. El resumen se basa en los minutos que realmente se lograron asignar a tiempo. |
| ¿Cómo se evita que dos sesiones se solapen? | `generateStudyPlan` rechaza espacios solapados y avanza el inicio disponible tras cada sesión. La siguiente sesión empieza donde terminó la anterior o en otro espacio. |
| ¿Qué significa MVP? | Producto mínimo viable. En este caso permite registrar, conservar y planificar actividades, y detectar cuándo falta tiempo. |
| ¿Qué parte utiliza reglas y cuáles son sus limitaciones? | `generateStudyPlan` aplica reglas deterministas con los datos ingresados. Depende de que los espacios y las estimaciones reflejen la realidad. No aprende de hábitos ni sincroniza calendarios. |

## E. Lista manual de comprobaciones

- [ ] Crear y editar una actividad. Cancelar una edición y confirmar que los cambios descartados no aparecen en la lista.
- [ ] Marcar una actividad como completada y luego como pendiente. Confirmar que el plan excluye las completadas.
- [ ] Crear, editar y eliminar un espacio. Cancelar una confirmación de eliminación y comprobar que el registro permanece. Confirmar después la eliminación de una actividad y de un espacio.
- [ ] Recargar en el mismo origen. Verificar que se conservan las actividades y los espacios, y volver a generar el plan.
- [ ] Enviar un título vacío o con espacios, una duración cero o fraccionaria, y campos de fecha u hora incompletos. Verificar mensajes y ausencia de nuevos registros.
- [ ] Probar un intervalo invertido, uno con inicio pasado, dos que se solapen y dos contiguos. Solo los contiguos son válidos en esas pruebas.
- [ ] Usar una actividad de prueba que ya esté vencida. Verificar que el plan deja todos sus minutos pendientes. Se puede preparar el día anterior con entrega para ese día y abrirla al día siguiente.
- [ ] Comprobar la falta de 120 min del guion y repetir con tiempo disponible solo después de una entrega. Verificar que una actividad puede repartirse entre espacios.
- [ ] Cambiar una actividad o un espacio después de generar. Verificar que se oculta el plan anterior y se pide generarlo de nuevo.
- [ ] Medir en el navegador el tiempo desde **Generar plan** hasta mostrar el resultado con **15 actividades**. Registrar equipo, navegador y tiempo observado para contrastarlo con el objetivo de **3 segundos**.
- [ ] Realizar **20 envíos inválidos** en el perfil de demostración. Anotar el campo, el mensaje y si se creó algún registro. Combinar errores de actividades y disponibilidad.

La compilación comprueba tipos y genera los archivos de producción. Los resultados funcionales y los objetivos de calidad anteriores requieren ejecutar y registrar las comprobaciones manuales.
