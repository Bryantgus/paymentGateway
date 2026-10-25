# CLAUDE.md

Guía para trabajar en este proyecto. Documentación general y puesta en marcha: [`README.md`](README.md).

## Qué es
Demo educativa de una pasarela de pago con Stripe **en modo de pruebas**. Node.js + Express + TypeScript, con Clean Architecture. Está pensado para crecer, así que mantén la separación de capas aunque algo parezca pequeño.

## Comandos
- `npm run dev`: compila el cliente y arranca con recarga (`tsx watch src/main.ts`).
- `npm run typecheck`: revisa servidor y cliente. Ejecútalo después de cualquier cambio.
- `npm run build`: compila a `dist/` (servidor) y `public/js/` (cliente).
- No hay framework de pruebas todavía.

## Arquitectura y reglas de dependencia
`domain` ← `application` ← `infrastructure`; `api` por fuera; `composition-root.ts` lo conecta todo.

| Capa | Puede importar | No puede importar |
|---|---|---|
| `domain/` | nada | todo lo demás |
| `application/` | `domain` | `infrastructure`, `api`, `express`, `stripe` |
| `infrastructure/` | `application`, `domain`, SDKs externos | `api` |
| `api/` | `application`, `domain` | `infrastructure` |
| `composition-root.ts` | todo | — |

Reglas concretas:
- **Solo `infrastructure/stripe/` importa el SDK de Stripe.** Los eventos de Stripe se traducen a `PaymentEvent` (`domain/payments/payment-event.ts`) en `stripe-webhook-verifier.ts`.
- **Los casos de uso dependen de puertos** (`application/ports/`), no de implementaciones. Una implementación nueva se escribe en `infrastructure/` y se conecta en `composition-root.ts`.
- **Errores:** los casos de uso lanzan errores de `application/errors.ts`; `api/middleware/error-handler.ts` es el único lugar que los convierte en respuestas HTTP.
- **Rutas:** reciben sus dependencias como parámetros (`xxxRoutes({ ... })`); no importan implementaciones concretas.
- **Webhook:** necesita el body crudo, por eso se monta antes de `express.json()` en `app.ts`. Mantén ese orden.
- **El servidor no crea la app y la escucha en el mismo sitio:** `createApp()` (en `app.ts`) construye, `main.ts` escucha. Así se puede probar sin abrir un puerto.
- **DTO:** el contrato HTTP (`api/dto/`) es independiente del modelo de dominio (hoy `nombre`/`monto` en JSON y `name`/`amount` en dominio).

## Convenciones de código
- Nombres técnicos en inglés (`PaymentGateway`, `CreatePayment`, `InMemoryProductCatalog`). Comentarios, mensajes al usuario y documentación en español.
- Los montos van **en centavos** (enteros). El precio siempre se decide en el servidor, nunca se acepta del cliente.
- Servidor en CommonJS (`module: node16`), sin extensión en los imports relativos. Cliente en ES modules: los imports relativos **sí llevan `.js`** (`./api.js`), porque el navegador los carga tal cual.
- `strict` activado en ambos `tsconfig`. TypeScript 7: no uses `moduleResolution: node`.
- `public/js/` y `dist/` son salida generada y están en `.gitignore`.

## Seguridad
- Solo claves de **modo de pruebas**: `env.ts` rechaza lo que no empiece por `sk_test_` / `pk_test_`. No relajes esa validación.
- Nunca imprimas, registres ni pegues en documentación las claves del `.env` ni el `whsec_`. Si necesitas mostrarlas, enmascara todo salvo el prefijo.
- Los datos de tarjeta nunca deben pasar por el servidor (los maneja el Payment Element de Stripe). No agregues campos de tarjeta propios.
- Verifica siempre la firma del webhook; no proceses eventos sin verificar.

## Stripe y entorno local
- Los webhooks en local necesitan `stripe listen` (ver README). La CLI actual exige `--events …` o `--all-snapshot`.
- **La CLI y las claves del `.env` deben apuntar a la misma cuenta de Stripe.** Si hay varios entornos de prueba pueden diferir; comprueba con `stripe get /v1/account` y usa `--api-key` si hace falta.
- En Windows, tras instalar la CLI con `winget` hay que abrir una terminal nueva para que `stripe` esté en el PATH.

## Pendiente (a futuro)
Funcionalidades que se agregarán más adelante. Detalle de cada una en el README.

- **Reembolsos.** Caso de uso `RefundPayment`, método nuevo en `PaymentGateway`, ruta HTTP y eventos `refund.*`. Los eventos nuevos se traducen en `stripe-webhook-verifier.ts` y se agregan a `PaymentEvent`.
- **Disputas (contracargos).** Manejo de `charge.dispute.*` en el webhook, estado `disputada` en las órdenes y envío de evidencia a Stripe. Requiere guardar órdenes, así que depende de añadir persistencia.

Ideas que se han comentado pero **no están decididas**: persistencia de órdenes (por ejemplo SQLite), idempotencia al crear pagos y al procesar webhooks (deduplicar por `event.id`), y un script `npm run stripe:listen` que lea la clave del `.env`. No las implementes sin que se pidan.

## Forma de trabajo
- Si el usuario hace una **pregunta** ("¿es necesario X?", "¿para qué sirve Y?"), responde y espera. Implementa solo cuando lo pida de forma explícita.
- Este es un proyecto para aprender cómo funciona una pasarela de pago: explica los conceptos con claridad y mantén el código simple y legible.
