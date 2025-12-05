# Sistema de Trial - Guía de Despliegue en Cloudflare Pages

## Resumen del Sistema

El contador de trial usa **la dirección IP** como identificador principal. Esto significa:
- ✅ Cambiar de navegador NO renueva el contador (misma IP)
- ✅ Reiniciar el ordenador NO renueva el contador (misma IP)
- ✅ Navegación privada NO renueva el contador (misma IP)
- ⚠️ Cambiar de red WiFi/VPN SÍ podría renovar (IP diferente)

---

## PASO 1: Subir a GitHub

Asegúrate de que tu repositorio tenga esta estructura:

```
tu-repositorio/
├── functions/
│   └── api/
│       └── trial.js    ← IMPORTANTE: Este archivo
├── index.html
├── favicon.png
├── logo-gbm.png
└── otros archivos...
```

Comandos:
```bash
git add .
git commit -m "Sistema de trial con protección por IP"
git push origin main
```

---

## PASO 2: Crear KV Namespace

1. Ve a https://dash.cloudflare.com
2. Menú izquierdo → **Workers & Pages** → **KV**
3. Clic en **Create a namespace**
4. Nombre: `TRIAL_KV`
5. Clic en **Add**

---

## PASO 3: Vincular KV al Proyecto

1. Ve a **Workers & Pages** → selecciona tu proyecto
2. Pestaña **Settings**
3. Menú izquierdo → **Functions**
4. Sección **KV namespace bindings** → **Add binding**
5. Configura:
   - Variable name: `TRIAL_KV` (exactamente así)
   - KV namespace: selecciona el que creaste
6. **Save**

---

## PASO 4: Redesplegar

**Opción A:** Haz un nuevo push a GitHub
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

**Opción B:** En Cloudflare Dashboard
1. Ve a tu proyecto → **Deployments**
2. En el último deployment → clic en ⋮ → **Retry deployment**

---

## PASO 5: Verificar que Funciona

1. Abre tu sitio desplegado (NO localhost)
2. Abre DevTools (F12) → pestaña **Network**
3. Recarga la página
4. Busca la petición `trial`
5. **DEBE** devolver JSON como: `{"remaining":10,"isNew":true}`
6. Si devuelve HTML → el KV no está configurado

---

## Cómo Funciona la Protección

```
Usuario abre en Chrome    →  IP: 85.123.45.67  →  Cuota: 10
Usuario abre en Firefox   →  IP: 85.123.45.67  →  Cuota: 10 (misma)
Usuario reinicia PC       →  IP: 85.123.45.67  →  Cuota: 10 (misma)
Usuario usa VPN           →  IP: 192.168.1.99  →  Cuota: 10 (nueva IP = nueva cuota)
```

El sistema guarda DOS registros sincronizados:
1. **Por IP**: `trial:ip:{hash}` - Identifica la conexión
2. **Por Hardware**: `trial:hw:{hash}` - Identifica el dispositivo

Se usa el **MÍNIMO** de ambos, así que si cualquiera de los dos coincide, mantiene la cuota anterior.

---

## Limitaciones

| Situación | ¿Se renueva? | Razón |
|-----------|--------------|-------|
| Cambiar navegador | NO | Misma IP |
| Reiniciar PC | NO | Misma IP (normalmente) |
| Navegación privada | NO | Misma IP |
| Limpiar cookies | NO | Datos en servidor |
| Usar VPN | SÍ | IP diferente |
| Cambiar de WiFi | SÍ | IP diferente |
| Router con IP dinámica que cambia | SÍ | IP diferente |
| Varios usuarios en misma oficina | COMPARTEN | Misma IP pública |

---

## Solución de Problemas

### "El contador se renueva al cambiar de navegador"

1. **¿Estás probando en localhost?** El sistema SOLO funciona en Cloudflare Pages desplegado
2. **¿Configuraste el KV?** Revisa que `TRIAL_KV` esté vinculado
3. **Revisa los logs**: Workers & Pages → tu proyecto → Functions → Logs

### "Error 503 o KV_NOT_CONFIGURED"

El KV no está vinculado. Repite el Paso 3.

### "La petición /api/trial devuelve HTML"

La función no se desplegó. Verifica:
- La carpeta se llama exactamente `functions/api/`
- El archivo se llama exactamente `trial.js`
- Haz un nuevo deployment

---

## Verificación Rápida

Ejecuta esto en la consola del navegador (en tu sitio desplegado):

```javascript
fetch('/api/trial', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({action: 'check', fingerprint: 'test'})
}).then(r => r.json()).then(console.log);
```

Debe mostrar: `{remaining: 10, isNew: true}` o similar.

Si muestra error o HTML, el backend no está funcionando.

---

## Costos de Movimientos

| Acción | Costo |
|--------|-------|
| Cargar archivo | 1 |
| Análisis individual | 1 |
| Análisis automático completo | 1 |
| Deconvolución individual | 1 |
| Deconvolución múltiple | 2 |
| Exportar (CSV/Excel/JSON/PDF) | 2 |
