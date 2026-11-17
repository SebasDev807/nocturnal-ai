# Nocturne-IA

Nocturne-IA es un prototipo académico para estudiantes que trabajan y estudian. Permite registrar actividades con fecha límite y duración estimada, definir espacios libres de estudio y distribuir el trabajo pendiente dentro de esos espacios. El plan muestra las sesiones por día y alerta cuando falta tiempo antes de una entrega.

## Requisitos y ejecución

- Node.js 24 o posterior como opción recomendada para el conjunto de herramientas instalado. Vite 8.3.8 y ESLint 10.15.0 también admiten Node 20 desde 20.19 y Node 22 desde 22.13.
- pnpm 10. El entorno de revisión usa pnpm 10.33.0. El archivo `pnpm-lock.yaml` fija las dependencias, entre ellas React 19.3.1, TypeScript 6.0.3 y Tailwind CSS 4.3.2.
- Un navegador moderno con IndexedDB y `crypto.randomUUID()` disponible en un contexto seguro, como `localhost` o HTTPS.

Desde la raíz del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

Abre la dirección que imprime `pnpm dev` para usar la aplicación. `pnpm build` comprueba TypeScript y genera los archivos de producción en `dist/`. `pnpm preview` sirve esa compilación en local.

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `src/main.tsx` y `src/App.tsx` | Montaje con `StrictMode` y coordinación de las secciones. |
| `src/features/activities/` | Formulario, listado, validación de campos y hook de actividades. |
| `src/features/availability/` | Formulario, listado, sección y hook de disponibilidad. |
| `src/features/studyPlan/` | Generación a demanda y presentación del plan en memoria. |
| `src/domain/` | Tipos, utilidades de fechas y horas locales, validación de intervalos y algoritmo puro de planificación. |
| `src/storage/` | Conexión a IndexedDB y repositorios para los almacenes `activities` y `availability`. |
| `docs/` | Guía de demostración y comprobaciones manuales. |

## Flujo de datos

**Componente → hook → repositorio → IndexedDB.** El formulario valida los campos y solicita el guardado. El hook coordina la carga, los errores y el bloqueo de escrituras duplicadas. El repositorio abre la transacción sobre `nocturne-ia` y espera `transaction.oncomplete` para confirmar las escrituras. Después el hook actualiza la lista de React y el formulario puede limpiarse. Si el guardado falla, se muestran los errores y se conservan los valores del formulario.

`App` usa una instancia de cada hook. El planificador toma las listas cargadas y la hora local al pulsar **Generar plan**. Un cambio de datos invalida el resultado y requiere generarlo otra vez.

## Planificación

`generateStudyPlan` valida las entradas, excluye actividades completadas y ordena las pendientes por fecha límite, con desempate por identificador. Recorre cronológicamente los espacios y asigna minutos a cada actividad solo hasta el final de su fecha límite. Una actividad puede ocupar varios espacios y cada espacio puede alojar varias sesiones consecutivas. Las tareas vencidas conservan todos sus minutos como pendientes. Un espacio en curso aporta únicamente los minutos completos que quedan.

El resumen se obtiene a partir de lo que se pudo asignar. Puede sobrar disponibilidad total y faltar tiempo para una entrega temprana.

## Convenciones y limitaciones

Los nombres de código y archivos están en inglés. Los textos de interfaz, comentarios y TSDoc están en español. Las funciones propias usan notación de flecha. TypeScript tiene el modo estricto habilitado y la interfaz, el estado, la persistencia y el cálculo se mantienen separados.

- Los datos se guardan en el perfil del navegador y en el origen utilizado, que incluye protocolo, host y puerto. Cambiar de origen o borrar los datos del sitio puede dejar los registros fuera de alcance.
- El MVP carece de sincronización entre dispositivos y de importación automática desde plataformas académicas. Una pestaña puede necesitar recargarse para ver cambios hechos en otra.
- El planificador aplica reglas deterministas. Las duraciones son estimaciones ingresadas por el estudiante y el cálculo no usa un modelo avanzado de IA.
- Los espacios se registran en hora local. Si la hora de fin es anterior a la de inicio, el espacio termina al día siguiente. No se generan recurrencias ni descansos automáticos. El plan se pierde al recargar y puede quedar desactualizado por el paso del tiempo hasta que se vuelva a generar.

Consulta la [guía de sustentación](docs/presentation-guide.md) para preparar la demostración y la revisión manual.
