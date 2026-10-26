import type {
  Stripe as StripeClient,
  StripeConstructor,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { createPayment, fetchConfig } from './api.js';
import { $ } from './dom.js';
import { formatUSD } from './format.js';
import { attemptKeyFor, finishAttempt } from './idempotency-key.js';
import { showMessage } from './messages.js';
import type { Product } from './types.js';

// Defined by the https://js.stripe.com/v3/ script loaded in index.html
declare const Stripe: StripeConstructor;

let stripe: StripeClient;
let elements: StripeElements;
let paymentElement: StripePaymentElement | undefined;
let products: Record<string, Product>;

const selectedProduct = () => $<HTMLSelectElement>('product').value;

function updateTotal(): void {
  $('total').textContent = formatUSD(products[selectedProduct()].amount);
}

function showSuccess(): void {
  finishAttempt(); // the purchase is over: the next one will use another idempotency key
  showMessage('Payment successful!', 'ok');
  $('product-step').hidden = true;
  $('payment-form').hidden = true;
  $('btn-keep-shopping').hidden = false;
}

function keepShopping(): void {
  paymentElement?.destroy();
  paymentElement = undefined;
  // Clears the parameters Stripe adds to the URL after a 3D Secure redirect
  history.replaceState(null, '', location.pathname);

  $<HTMLButtonElement>('btn-pay').disabled = false;
  $('btn-keep-shopping').hidden = true;
  $('payment-form').hidden = true;
  $('product-step').hidden = false;
  showMessage('');
}

/** If Stripe redirected back after a 3D Secure challenge, we show the result. */
async function showResultAfterRedirect(): Promise<void> {
  const clientSecret = new URLSearchParams(location.search).get('payment_intent_client_secret');
  if (!clientSecret) return;

  const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
  if (paymentIntent?.status === 'succeeded') showSuccess();
  else showMessage(`Payment status: ${paymentIntent?.status}`, 'error');
}

async function onContinue(): Promise<void> {
  const button = $<HTMLButtonElement>('btn-continue');
  button.disabled = true; // prevents the double click; the lab reproduces that double submit on its own
  // If it fails (network cut), the retry reuses the same key and the server recognizes it as the same purchase
  const result = await createPayment(selectedProduct(), attemptKeyFor(selectedProduct()));
  button.disabled = false;
  if (!result.ok) {
    showMessage(result.error, 'error');
    return;
  }

  elements = stripe.elements({ clientSecret: result.clientSecret });
  paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  $('product-step').hidden = true;
  $('payment-form').hidden = false;
  showMessage('');
}

async function onPay(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const btn = $<HTMLButtonElement>('btn-pay');
  btn.disabled = true;
  showMessage('Processing...');

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: location.href.split('?')[0] },
    redirect: 'if_required', // only redirects if the payment method requires it (e.g. 3D Secure)
  });

  if (error) {
    showMessage(error.message ?? 'Error processing the payment', 'error');
    btn.disabled = false;
  } else if (paymentIntent.status === 'succeeded') {
    showSuccess();
  }
}

export async function initCheckout(): Promise<void> {
  const config = await fetchConfig();
  products = config.products;
  stripe = Stripe(config.publishableKey);

  const select = $<HTMLSelectElement>('product');
  for (const [id, p] of Object.entries(products)) {
    select.add(new Option(`${p.name} - ${formatUSD(p.amount)}`, id));
  }
  updateTotal();

  select.addEventListener('change', updateTotal);
  $('btn-continue').addEventListener('click', onContinue);
  $('payment-form').addEventListener('submit', onPay);
  $('btn-keep-shopping').addEventListener('click', keepShopping);

  await showResultAfterRedirect();
}
