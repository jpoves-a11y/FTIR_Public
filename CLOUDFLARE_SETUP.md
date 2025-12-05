# Configuracion de Cloudflare Pages con KV para Trial System

Este documento explica como configurar el sistema de trial con almacenamiento servidor usando Cloudflare Pages Functions y KV.

## Requisitos

- Cuenta de Cloudflare (gratis)
- Repositorio en GitHub conectado a Cloudflare Pages

## Paso 1: Crear el KV Namespace

1. Ve a tu dashboard de Cloudflare: https://dash.cloudflare.com
2. Selecciona tu cuenta
3. En el menu lateral, ve a **Workers & Pages** > **KV**
4. Click en **Create a namespace**
5. Nombre: `TRIAL_KV` (o el nombre que prefieras)
6. Click en **Add**
7. Anota el ID del namespace que se genera

## Paso 2: Conectar KV al proyecto de Pages

1. Ve a **Workers & Pages** en el menu lateral
2. Selecciona tu proyecto de Pages
3. Ve a **Settings** > **Functions**
4. En la seccion **KV namespace bindings**, click en **Add binding**
5. Variable name: `TRIAL_KV` (IMPORTANTE: debe ser exactamente este nombre)
6. KV namespace: Selecciona el namespace que creaste en el paso 1
7. Click en **Save**

## Paso 3: Desplegar

1. Haz push de los cambios a tu repositorio de GitHub
2. Cloudflare Pages detectara automaticamente el directorio `functions/`
3. El endpoint `/api/trial` estara disponible automaticamente

## Estructura del proyecto

```
tu-proyecto/
├── index.html          # Aplicacion principal
├── functions/
│   └── api/
│       └── trial.js    # API endpoint para el trial
├── server.py           # Servidor local (opcional)
└── CLOUDFLARE_SETUP.md # Este archivo
```

## Como funciona

### Almacenamiento del contador

El sistema almacena el contador de uso usando:
- **Fingerprint del navegador**: Canvas, WebGL, audio, hardware, etc.
- **IP del cliente**: Cloudflare proporciona la IP real via `CF-Connecting-IP`
- **Hash combinado**: Se crea un hash SHA-256 del fingerprint + IP

Esto significa que:
- Cambiar de navegador NO renueva el contador (misma IP)
- Navegacion privada NO renueva el contador (misma IP + fingerprint similar)
- Cambiar de cuenta de correo NO renueva el contador (misma IP + dispositivo)

### Fallback local

Si el servidor no esta disponible (error de red, KV no configurado), el sistema usa almacenamiento local como respaldo:
- localStorage
- sessionStorage
- IndexedDB
- Cache API

## API Endpoints

### POST /api/trial

**Accion: check** - Verifica el estado actual del trial
```json
{
  "action": "check",
  "fingerprint": "abc123..."
}
```

Respuesta:
```json
{
  "remaining": 10,
  "isNew": true
}
```

**Accion: use** - Consume movimientos del trial
```json
{
  "action": "use",
  "fingerprint": "abc123...",
  "cost": 1
}
```

Respuesta:
```json
{
  "remaining": 9,
  "used": 1,
  "exhausted": false
}
```

## Configuracion del Trial

En `functions/api/trial.js`:

```javascript
const TRIAL_CONFIG = {
  maxMovements: 10,           // Numero maximo de movimientos
  fingerprintSalt: 'TU_SALT' // Salt para hash (cambialo!)
};
```

## Limites gratuitos de Cloudflare KV

- 100,000 lecturas/dia
- 1,000 escrituras/dia
- 1 GB de almacenamiento

Esto es mas que suficiente para un sistema de trial.

## Solución de problemas

### El contador se sigue reiniciando

1. Verifica que el KV namespace este correctamente vinculado
2. Revisa los logs en **Workers & Pages** > **tu-proyecto** > **Functions** > **Real-time logs**
3. Asegurate de que el binding se llame exactamente `TRIAL_KV`

### Error "Server configuration error"

El KV no esta configurado. Sigue los pasos 1 y 2 de esta guia.

### El API no responde

1. Verifica que el directorio `functions/` este en la raiz del proyecto
2. Asegurate de que el archivo sea `functions/api/trial.js`
3. Revisa que no haya errores de sintaxis en el archivo

## Seguridad

- Las claves de trial se hashean con SHA-256
- La IP del cliente se obtiene de Cloudflare (no se puede falsificar)
- Los datos expiran despues de 1 año automaticamente
- No se almacena informacion personal identificable

## Contacto

Para soporte tecnico, contacta a: gbmunizar@gmail.com
