import { $ } from './dom.js';

/** Botón flotante "?" y modal con las tarjetas de prueba. */
export function initHelpModal(): void {
  const modal = $<HTMLDialogElement>('modal-tarjetas');

  $('btn-ayuda').addEventListener('click', () => modal.showModal());
  $('btn-cerrar').addEventListener('click', () => modal.close());
  // Clic en el fondo oscuro (fuera del contenido) cierra el modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
}
