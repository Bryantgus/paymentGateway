import { $ } from './dom.js';

/** Floating "?" button and modal with the test cards. */
export function initHelpModal(): void {
  const modal = $<HTMLDialogElement>('cards-modal');

  $('btn-help').addEventListener('click', () => modal.showModal());
  $('btn-close').addEventListener('click', () => modal.close());
  // A click on the dark backdrop (outside the content) closes the modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
}
