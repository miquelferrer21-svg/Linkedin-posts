# Diseño: Creador Manual de Tarjetas Visuales

**Fecha:** 2026-03-18
**Proyecto:** finomik-content-hub
**Estado:** Aprobado por usuario

---

## Objetivo

Añadir una pagina `/crear` donde el usuario puede rellenar campos especificos por tipo de post, ver la tarjeta visual en tiempo real y guardar el post en Supabase como parte del banco de contenido.

---

## Contexto actual

- El dashboard muestra posts generados por agentes de IA, organizados por tipo.
- `VisualCard.tsx` renderiza 6 tipos de tarjeta a partir de un string markdown que parsea con regex.
- Los posts se guardan en la tabla `documents` con: `id`, `session_id`, `type`, `content`, `status`, `created_at`.
- La tabla `sessions` tiene `id` y `date`. Los documentos pertenecen a una sesion.
- No existe ninguna forma de crear posts manualmente desde la interfaz.

---

## Diseño

### Layout general

Pagina `/crear` con dos columnas al 50%:

```
┌─────────────────────────────────────────────────────────────┐
│  [← Volver]  Finomik Content Hub                           │  ← Header
├──────────────────────────┬──────────────────────────────────┤
│  [📰][💬][📊][💸][🧠][🚀]│                                  │
│  ─────────────────────── │    Preview en vivo               │
│  Campo 1                 │    (VisualCard 500x500)          │
│  Campo 2                 │                                  │
│  Campo 3                 │    [A] [B]  (si aplica)          │
│  ...                     │    [1·Problema][2·Impacto][3·Sol]│
│                          │    (solo para Error Financiero)  │
│  [Guardar]               │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### Navegacion

- El header del dashboard gana un boton "Crear post" que navega a `/crear`.
- El header de `/crear` muestra "← Volver" que regresa al dashboard.
- Al guardar con exito, redirige a `/dashboard` con el tipo activo igual al del post creado (via state o query param).

---

## Campos por tipo de post

Los campos corresponden exactamente a lo que los parsers de `VisualCard` extraen del markdown. El formulario construye el markdown internamente a partir de los campos y lo pasa a `VisualCard` como prop `content`.

### noticia_financiera

| Campo | Descripcion | Restricciones |
|---|---|---|
| Titular | Pregunta o dato impactante | max 100 chars |
| Fuente | Organismo o medio (ej: Banco de España) | max 60 chars |
| Contexto | 2-3 lineas de que ha pasado | textarea |
| Conexion con FinoMik | 1 frase que mencione FinoMik | max 200 chars |
| Hashtag tematico | Un hashtag sin # (se añade automaticamente) | max 30 chars |

Markdown generado:
```
{titular}
Fuente: {fuente}

{contexto}

{conexionFinomik}

#{hashtagTematico}
```

**Nota de implementacion:** La linea de fuente DEBE ir prefijada con "Fuente: " (el parser `parseNoticia` en `VisualCard` necesita detectarla, y se actualizara para aceptar tambien el patron `fuente:` ademas de los nombres de organismos). Ver cambios en `VisualCard.tsx` mas abajo.

### frase_iconica

| Campo | Descripcion | Restricciones |
|---|---|---|
| Frase | La cita completa | textarea, max 300 chars |
| Nombre del autor | Nombre completo | max 60 chars |
| Cargo del autor | Cargo o contexto breve | max 80 chars |

Markdown generado:
```
"{frase}"
— {nombre}, {cargo}
```

### dato_impactante

| Campo | Descripcion | Restricciones |
|---|---|---|
| Cifra | Solo el numero y unidad (ej: "68%", "4 de cada 10") | max 50 chars |
| Etiqueta | Descripcion breve del dato | max 80 chars |
| Contexto | 2 lineas de significado real | textarea |
| Fuente | Organismo (ej: OCDE, INE) | max 60 chars |

Markdown generado:
```
{cifra}
{etiqueta}

{contexto}

Fuente: {fuente}
```

### error_financiero

| Campo | Descripcion | Restricciones |
|---|---|---|
| Cifra | Solo numero y unidad (ej: "72%") | max 40 chars |
| Etiqueta del error | Descripcion del error en 1 frase | max 100 chars |
| Explicacion | Por que es un error, min 60 chars | textarea |
| Consecuencia 1 Titulo | | max 40 chars |
| Consecuencia 1 Texto | | max 100 chars |
| Consecuencia 2 Titulo | | max 40 chars |
| Consecuencia 2 Texto | | max 100 chars |
| Consecuencia 3 Titulo | | max 40 chars |
| Consecuencia 3 Texto | | max 100 chars |
| Solucion 1 Titulo | | max 40 chars |
| Solucion 1 Texto | | max 100 chars |
| Solucion 2 Titulo | | max 40 chars |
| Solucion 2 Texto | | max 100 chars |
| Solucion 3 Titulo | | max 40 chars |
| Solucion 3 Texto | | max 100 chars |

Markdown generado:
```
{cifra}
{etiqueta}
{explicacion}

1. {cons1Titulo}: {cons1Texto}
2. {cons2Titulo}: {cons2Texto}
3. {cons3Titulo}: {cons3Texto}

✅ {sol1Titulo}: {sol1Texto}
✅ {sol2Titulo}: {sol2Texto}
✅ {sol3Titulo}: {sol3Texto}
```

### concepto_mes

| Campo | Descripcion | Restricciones |
|---|---|---|
| Nombre del concepto | max 4 palabras | max 40 chars |
| Mes | Nombre del mes en español | selector dropdown — el valor elegido debe ser la unica palabra de mes en todo el markdown generado; los campos Nombre del concepto, Definicion y Pasos no deben contener nombres de meses |
| Definicion | 1 frase en lenguaje cotidiano | max 200 chars |
| Paso 1 | | max 100 chars |
| Paso 2 | | max 100 chars |
| Paso 3 | | max 100 chars |
| Palabra clave 1 | Sustantivo corto | max 18 chars |
| Palabra clave 2 | Sustantivo corto | max 18 chars |
| Palabra clave 3 | Sustantivo corto | max 18 chars |

Markdown generado:
```
{concepto}
{mes}

📌 {definicion}

1. {paso1}
2. {paso2}
3. {paso3}

{pill1}
{pill2}
{pill3}
```

### nueva_funcionalidad

| Campo | Descripcion | Restricciones |
|---|---|---|
| Nombre de la funcionalidad | max 6 palabras | max 60 chars |
| Descripcion | DEBE empezar por "Ahora puedes", "A partir de hoy" o "FinoMik permite" — es un requisito del parser, no solo una sugerencia | max 200 chars |
| Caracteristica 1 | Beneficio concreto | max 100 chars |
| Caracteristica 2 | Beneficio concreto | max 100 chars |
| Caracteristica 3 | Beneficio concreto | max 100 chars |

Markdown generado:
```
{nombre}
{descripcion}

- {car1}
- {car2}
- {car3}
```

---

## Preview en vivo

- La columna derecha renderiza `<VisualCard type={activeType} content={markdownGenerado} />`.
- El markdown se recalcula en cada keystroke a partir del estado del formulario.
- Si los campos obligatorios estan vacios, `VisualCard` muestra la tarjeta con placeholders (comportamiento ya existente en los parsers).
- Para tarjetas con version A/B, se muestran los botones de version debajo de la preview (igual que en `PostCard`).
- Para Error Financiero, se muestran los botones de slide.
- La preview no es interactiva en cuanto a exportacion: el boton de exportar PNG no aparece aqui.
- Para Error Financiero, la preview muestra TANTO los botones de slide (1/2/3) COMO los botones de version A/B, igual que en `VisualCard` (no son mutuamente excluyentes).

---

## Flujo de guardado

1. Usuario hace clic en "Guardar".
2. Se valida que los campos obligatorios no esten vacios (titular, frase, cifra, nombre del concepto, nombre de la funcionalidad, segun el tipo).
3. Se busca en Supabase una sesion con `date = hoy` (formato `YYYY-MM-DD`). Si no existe, se crea con `INSERT INTO sessions (date) VALUES (hoy)`.
4. Se hace `INSERT INTO documents (session_id, type, content, status)` con el markdown generado, el tipo activo y `status = 'sin_revisar'`.
5. Si hay error, se muestra un mensaje de error inline sin redirigir.
6. Si tiene exito, se redirige a `/dashboard` con el tipo activo igual al del post creado.

---

## Archivos afectados

| Archivo | Accion |
|---|---|
| `src/App.tsx` | Añadir ruta `/crear` |
| `src/pages/Dashboard.tsx` | Añadir boton "Crear post" en el header |
| `src/pages/Creator.tsx` | Crear pagina nueva |
| `src/components/PostCard.tsx` | Eliminar el JSX de la fecha (sin cambiar props ni interfaz) |
| `src/components/VisualCard.tsx` | Actualizar `parseNoticia`: añadir `fuente:` al patron de deteccion de fuente |

### `src/pages/Creator.tsx` — Nueva pagina

Estructura de estado local:
```typescript
const [activeType, setActiveType] = useState<PostType>('noticia_financiera')
const [fields, setFields] = useState<Record<string, string>>({})
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)
```

Al cambiar de tipo, `fields` se resetea a `{}`.

La funcion `buildMarkdown(type, fields)` construye el string markdown segun el tipo activo. Es una funcion pura que el componente llama en cada render para pasar a `VisualCard`.

### `src/components/PostCard.tsx`

Eliminar el bloque JSX que muestra la fecha del post. No cambiar la interfaz `Post` ni las props del componente: el campo `date` sigue existiendo en el tipo pero simplemente deja de renderizarse.

---

## Lo que NO cambia

- `VisualCard.tsx`: sin cambios. Se reutiliza tal cual.
- Sistema de autenticacion.
- Exportacion a PNG (sigue disponible desde el dashboard).
- Logica de estados y filtros del dashboard.
