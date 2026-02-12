# 🎙️ Control por Voz con Wake Word + OpenAI

Aplicación web para reconocimiento y clasificación de comandos por voz utilizando **Web Speech API** y **OpenAI**, con sistema de activación mediante *Wake Word*.

> Desarrollado por **Axel Llanderal Arteaga**  
> Ingeniería en Tecnologías de la Información y Comunicaciones  
> TecNM Campus Pachuca  

---

## 🚀 Descripción

Este proyecto permite controlar un sistema mediante comandos de voz desde el navegador.

La aplicación:

- 🎧 Escucha automáticamente al cargar la página.
- 😴 Entra en modo **Suspendido** tras un tiempo de inactividad.
- 🔊 Se reactiva al detectar una **Wake Word**.
- 🧠 Clasifica comandos usando OpenAI.
- ✅ Solo devuelve comandos permitidos previamente definidos.

Está diseñado para integrarse posteriormente con robots, microcontroladores o sistemas físicos.

---

## 🧠 Funcionamiento

### 1️⃣ Reconocimiento de voz
Se utiliza la **Web Speech API** para:

- Capturar audio desde el micrófono
- Transcribirlo en tiempo real
- Procesar el texto detectado

---

### 2️⃣ Wake Word

El sistema utiliza una palabra clave para activarse cuando está suspendido.

Wake Word actual:

Alpha


Puede modificarse en el archivo `app.js`:

```javascript
const WAKE_WORD = "alfa";

## Clasificación de comandos

El sistema sigue este flujo:

Intenta identificar el comando localmente (rápido y eficiente).

Si no lo reconoce, envía el texto a OpenAI.

Valida que la respuesta sea una opción permitida.

Si no coincide → devuelve: Orden no reconocida

## Comandos Permitidos

El sistema solo puede responder con:

avanzar

retroceder

detener

vuelta derecha

vuelta izquierda

90° derecha

90° izquierda

360° derecha

360° izquierda

Orden no reconocida

## Tecnologías Utilizadas

HTML5

CSS3 (Glassmorphism + diseño moderno)

Bootstrap 5

Bootstrap Icons

JavaScript ES6+

Web Speech API

OpenAI API (gpt-4o-mini)

MockAPI (para obtener API Key)