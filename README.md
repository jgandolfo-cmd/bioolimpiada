# BioOlimpiada OAB

Plataforma de entrenamiento para la Olimpíada Argentina de Biología.
Basada en Curtis Biología 7ma edición.

## Deploy en Vercel (10 minutos, gratis)

### Paso 1 — Subir a GitHub

1. Entrá a [github.com](https://github.com) con tu cuenta
2. Hacé clic en **New repository** (botón verde arriba a la derecha)
3. Nombre: `bioolimpiada` · Visibilidad: **Private** · Creá el repo
4. En la página del repo vacío, hacé clic en **uploading an existing file**
5. Arrastrá TODOS los archivos de esta carpeta (incluyendo la carpeta `api/`)
6. Clic en **Commit changes**

### Paso 2 — Conseguir la API key de Gemini (gratis, sin tarjeta)

1. Entrá a [aistudio.google.com](https://aistudio.google.com)
2. Iniciá sesión con tu cuenta de Google
3. Clic en **Get API Key** (arriba a la izquierda) → **Create API key**
4. Copiá la key (empieza con `AIza...`)

Límite del free tier: **1,500 requests/día** — más que suficiente para una escuela.

### Paso 3 — Conectar con Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Continue with GitHub**
2. Clic en **Add New Project**
3. Buscá tu repo `bioolimpiada` → **Import**
4. En **Environment Variables** agregá:
   - Nombre: `GEMINI_API_KEY`
   - Valor: la key que copiaste (la que empieza con `AIza...`)
5. Clic en **Deploy**

### Paso 3 — Listo

En ~2 minutos Vercel te da una URL tipo:
`https://bioolimpiada-abc123.vercel.app`

Compartís esa URL con tus alumnos. El código de acceso es el que configuraste en el código (`OAB2025` por defecto).

## Cambiar el código de acceso

En `index.html`, buscá la línea:
```
const PIN="OAB2025";
```
Cambiala por el código que quieras y subí el archivo actualizado a GitHub.
Vercel redespliega automáticamente en ~30 segundos.

## Conseguir la API key de Gemini (gratis, sin tarjeta)

1. Entrá a [aistudio.google.com](https://aistudio.google.com)
2. Iniciá sesión con tu cuenta de Google
3. Clic en **Get API Key** → **Create API key**
4. Copiá la key (empieza con `AIza...`)
5. Pegala en Vercel como variable de entorno `GEMINI_API_KEY`

**Límite gratuito:** 1,500 requests/día con Gemini 2.0 Flash. Para 30 alumnos con uso normal, alcanza y sobra. Si llegás al límite, el sistema devuelve un error y podés aumentar al día siguiente (el límite se resetea a las 00:00 Pacific Time).
