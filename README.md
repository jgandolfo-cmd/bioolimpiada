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

### Paso 2 — Conectar con Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. Clic en **Add New Project**
3. Buscá tu repo `bioolimpiada` → **Import**
4. En **Environment Variables** agregá:
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic (la conseguís en console.anthropic.com)
   - `ALLOWED_ORIGIN` = (dejalo vacío por ahora)
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

## Conseguir la API key de Anthropic (gratis)

1. Entrá a [console.anthropic.com](https://console.anthropic.com)
2. Creá una cuenta (es gratis, no requiere tarjeta para el free tier)
3. Menú izquierdo → **API Keys** → **Create Key**
4. Copiá la key (empieza con `sk-ant-...`)
5. Pegala en Vercel como variable de entorno `ANTHROPIC_API_KEY`
