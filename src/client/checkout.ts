import type {
  Stripe as StripeClient,
  StripeConstructor,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { createPayment, fetchConfig } from './api.js';
import { $ } from './dom.js';
import { formatUSD } from './format.js';
import { showMessage } from './messages.js';
import type { Product } from './types.js';

// Lo define el script https://js.stripe.com/v3/ cargado en index.html
declare const Stripe: StripeConstructor;

let stripe: StripeClient;
let elements: StripeElements;
let paymentElement: StripePaymentElement | undefined;
let products: Record<string, Product>;

const selectedProduct = () => $<HTMLSelectElement>('producto').value;

function updateTotal(): void {
  $('total').textContent = formatUSD(products[selectedProduct()].monto);
}

function showSuccess(): void {
  showMessage('¡Pago exitoso!', 'ok');
  $('paso-producto').hidden = true;
  $('form-pago').hidden = true;
  $('btn-seguir').hidden = false;
}

function keepShopping(): void {
  paymentElement?.destroy();
  paymentElement = undefined;
  // Limpia los parámetros que Stripe añade a la URL tras un 3D Secure
  history.replaceState(null, '', location.pathname);

  $<HTMLButtonElement>('btn-pagar').disabled = false;
  $('btn-seguir').hidden = true;
  $('form-pago').hidden = true;
  $('paso-producto').hidden = false;
  showMessage('');
}

/** Si Stripe redirigió de vuelta tras un 3D Secure, mostramos el resultado. */
async function showResultAfterRedirect(): Promise<void> {
  const clientSecret = new URLSearchParams(location.search).get('payment_intent_client_secret');
  if (!clientSecret) return;

  const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
  if (paymentIntent?.status === 'succeeded') showSuccess();
  else showMessage(`Estado del pago: ${paymentIntent?.status}`, 'error');
}

async function onContinue(): Promise<void> {
  const result = await createPayment(selectedProduct());
  if (!result.ok) {
    showMessage(result.error, 'error');
    return;
  }

  elements = stripe.elements({ clientSecret: result.clientSecret });
  paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  $('paso-producto').hidden = true;
  $('form-pago').hidden = false;
  showMessage('');
}

async function onPay(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const btn = $<HTMLButtonElement>('btn-pagar');
  btn.disabled = true;
  showMessage('Procesando...');

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: location.href.split('?')[0] },
    redirect: 'if_required', // solo redirige si el método lo exige (ej. 3D Secure)
  });

  if (error) {
    showMessage(error.message ?? 'Error al procesar el pago', 'error');
    btn.disabled = false;
  } else if (paymentIntent.status === 'succeeded') {
    showSuccess();
  }
}

export async function initCheckout(): Promise<void> {
  const config = await fetchConfig();
  products = config.productos;
  stripe = Stripe(config.publishableKey);

  const select = $<HTMLSelectElement>('producto');
  for (const [id, p] of Object.entries(products)) {
    select.add(new Option(`${p.nombre} - ${formatUSD(p.monto)}`, id));
  }
  updateTotal();

  select.addEventListener('change', updateTotal);
  $('btn-continuar').addEventListener('click', onContinue);
  $('form-pago').addEventListener('submit', onPay);
  $('btn-seguir').addEventListener('click', keepShopping);

  await showResultAfterRedirect();
}
