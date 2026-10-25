# Pasarela de pago (demo con Stripe en modo de pruebas)

Proyecto de aprendizaje para entender cómo funciona una pasarela de pago con tarjetas de prueba. Node.js + Express + TypeScript, organizado con **Clean Architecture**.

El formulario de tarjeta lo dibuja Stripe (Payment Element) dentro de un iframe, así que los datos de la tarjeta **nunca pasan por este servidor**.

> Solo funciona con claves de **modo de pruebas** (`sk_test_…` / `pk_test_…`). El servidor se niega a arrancar con otras.

## Requisitos

- Node.js 20 o superior (probado con 24).
- Una cuenta de Stripe con el **modo de pruebas** (sandbox) activado.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` como `.env` y completa las claves (ver tabla abajo).
3. `npm run dev` y abre http://localhost:3000

### Variables de entorno

| Variable | Obligatoria | Dónde se obtiene |
|---|---|---|
| `STRIPE_SECRET_KEY` | Sí | Dashboard → Desarrolladores → Claves de API (`sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Sí | Misma página (`pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Solo para webhooks | `stripe listen --print-secret` (`whsec_…`) |
| `PORT` | No | Por defecto `3000` |

El archivo `.env` está en `.gitignore`. No pegues las claves en chats, issues ni capturas.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Compila el cliente y arranca el servidor con recarga (`tsx watch`) |
| `npm run build` | Compila servidor (`dist/`) y cliente (`public/js/`) |
| `npm start` | Compila y ejecuta la versión compilada |
| `npm run typecheck` | Revisa los tipos de servidor y cliente sin generar archivos |

## Cómo funciona un pago

```
Navegador                    Tu servidor                    Stripe
   │  GET /config  ─────────────▶│                              │
   │◀── clave pública + productos│                              │
   │  POST /crear-pago {producto}▶│  paymentIntents.create ────▶│
   │◀── clientSecret ────────────│◀──────────────── PaymentIntent
   │  confirmPayment(tarjeta) ───────────────────────────────▶ │  (iframe de Stripe)
   │◀──────────────────────────────────────── resultado (UI)    │
   │                             │◀── webhook payment_intent.* ─│  ← la fuente confiable
```

- **El precio vive en el servidor.** El cliente solo envía el id del producto; el monto sale del catálogo.
- **El resultado que ve el usuario no es la fuente de verdad.** Puede cerrar la pestaña o fallar su red. El estado real de un pago lo confirma el **webhook**, cuya firma se verifica en cada llamada.

## Webhooks en local

Stripe no puede llamar a `localhost`. La [Stripe CLI](https://docs.stripe.com/stripe-cli) reenvía los eventos a tu máquina.

1. Instálala (`winget install Stripe.StripeCli` en Windows) y autoriza con `stripe login`.
2. Obtén el secreto y pégalo en `STRIPE_WEBHOOK_SECRET`:
   ```
   stripe listen --print-secret
   ```
3. Con el servidor corriendo, en otra terminal:
   ```
   stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:3000/webhook
   ```
   La CLI actual exige indicar los eventos con `--events` (o usar `--all-snapshot`).
4. Prueba sin pagar: `stripe trigger payment_intent.succeeded`. En la consola del servidor debe salir `✅ Pago aprobado …`.

> **La CLI debe escuchar la misma cuenta que usan tus claves.** Si tienes varios entornos de prueba, `stripe login` puede autorizar uno distinto al de tu `.env`, y entonces nunca llegarán eventos. Para forzarlo, añade `--api-key <tu sk_test_>` al comando `stripe listen` (y obtén el `whsec_` con esa misma clave). Se comprueba con `stripe get /v1/account`, que debe mostrar el mismo `acct_…` que tu clave.

### Dónde ver los logs

1. **Terminal del servidor** (`npm run dev`): lo que imprimen los casos de uso.
2. **Terminal de `stripe listen`**: cada evento enviado y la respuesta (`[200]` bien, `[400]` firma inválida, `[500]` error en tu código).
3. **Dashboard de Stripe** (modo de pruebas, cuenta correcta): *Pagos*, y *Workbench → Eventos / Registros*. Filtra los eventos por `payment_intent`.

## Tarjetas de prueba

En la app, el botón **?** (esquina inferior derecha) abre un modal con las tarjetas agrupadas por escenario: pago exitoso, rechazado, 3D Secure y fraude. Usa cualquier fecha futura, cualquier CVC y cualquier código postal. Lista oficial completa: https://docs.stripe.com/testing

Las más usadas: `4242 4242 4242 4242` (éxito), `4000 0000 0000 0002` (rechazada), `4000 0000 0000 9995` (fondos insuficientes), `4000 0000 0000 3220` (3D Secure obligatorio).

## Arquitectura

Clean Architecture, con las dependencias apuntando siempre hacia adentro: `domain` ← `application` ← `infrastructure`, y `api` como capa HTTP.

```
src/
├─ main.ts                  Arranque mínimo
├─ app.ts                   createApp(): arma Express sin escuchar (sirve para probarlo sin abrir un puerto)
├─ composition-root.ts      Único lugar que conecta implementaciones con casos de uso
├─ config/env.ts            Lee y valida el .env al arrancar
├─ domain/                  Reglas y tipos puros, sin dependencias
│  ├─ products/product.ts
│  └─ payments/payment-event.ts      Eventos de pago en nuestro vocabulario
├─ application/             Casos de uso y puertos (interfaces)
│  ├─ payments/create-payment.ts
│  ├─ webhooks/handle-webhook.ts
│  ├─ ports/                PaymentGateway, ProductCatalog, WebhookVerifier, Logger
│  └─ errors.ts
├─ infrastructure/          Implementa los puertos
│  ├─ stripe/               Gateway, verificador de webhooks y traducción de eventos
│  ├─ catalog/              Catálogo en memoria
│  └─ logging/              Logger de consola
├─ api/                     HTTP: routes/, middleware/ (errores en un solo lugar), dto/
└─ client/                  Frontend en TypeScript (api, checkout, help-modal, dom, format…)

public/                     HTML y CSS estáticos; el JS compilado sale en public/js/ (ignorado por git)
```

Solo `infrastructure/stripe` conoce el SDK de Stripe. Cambiar de pasarela o de catálogo se hace en infraestructura y en `composition-root.ts`, sin tocar casos de uso ni rutas.

Más detalle de las reglas y convenciones en [`CLAUDE.md`](CLAUDE.md).

### Endpoints

| Método y ruta | Descripción |
|---|---|
| `GET /config` | Clave publicable y catálogo de productos |
| `POST /crear-pago` | Crea el `PaymentIntent`. Body: `{ "producto": "<id>" }` → `{ "clientSecret": "…" }` |
| `POST /webhook` | Recibe eventos de Stripe (body crudo, firma verificada) |

## Pendiente (próximas funcionalidades)

### Reembolsos
Devolver total o parcialmente un pago ya cobrado, iniciado por el comercio. Implica un caso de uso `RefundPayment`, un método nuevo en el puerto `PaymentGateway`, una ruta y el manejo de los eventos `refund.*` en el webhook. Stripe ofrece tarjetas de prueba para reembolsos asíncronos (`4000 0000 0000 7726` y `4000 0000 0000 5126`).

### Disputas (contracargos)
Cuando el cliente reclama el cargo **a su banco** en lugar de pedirte un reembolso. El banco le devuelve el dinero y se lo descuenta a la cuenta del comercio mientras se resuelve, y suele cobrarse además una tarifa por disputa. Ciclo: se abre (`charge.dispute.created`), el comercio tiene un plazo (típicamente de 7 a 21 días) para enviar evidencia y el banco decide: ganada o perdida (`charge.dispute.closed`). Hay una fase previa, la *consulta*, que si se resuelve ahí evita el contracargo formal. Implica manejar los eventos `charge.dispute.*`, un estado `disputada` en las órdenes y una forma de enviar evidencia. Stripe tiene tarjetas de prueba que generan disputas (por ejemplo `4000 0000 0000 0259`).
