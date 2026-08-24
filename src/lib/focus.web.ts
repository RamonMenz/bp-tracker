import type { View } from 'react-native';

/**
 * Move o foco do DOM para `target` sem que o navegador role nada para revelá-lo.
 *
 * Serve para "estacionar" o foco num elemento estável antes de abrir um `Modal`: o
 * react-native-web guarda o `document.activeElement` do momento em que o modal monta e devolve o
 * foco para ele ao fechar (`ModalFocusTrap`, exigência de WCAG 2.4.3). Se esse elemento guardado
 * for uma célula reciclada de lista virtualizada, o `focus()` da devolução rola a lista até onde a
 * célula tiver ido parar — ver `handleRequestDelete` em `app/(app)/history.tsx`.
 *
 * `preventScroll` cobre só a chamada daqui; o que impede a rolagem na devolução é o alvo guardado
 * ser um elemento que não se move.
 */
export function focusWithoutScrolling(target: View | null): void {
  // No react-native-web a ref de uma View É o nó do DOM — o tipo `View` é só o contrato comum
  // com o nativo, então a ponte para HTMLElement passa por `unknown` (CLAUDE.md §3.1).
  const node = target as unknown as HTMLElement | null;

  if (node === null || typeof node.focus !== 'function') {
    return;
  }

  // Uma View comum não é focável. `-1` (e não `0`) a torna focável só por código, mantendo-a fora
  // da ordem de Tab — ela não é um controle, é só o ponto de pouso do foco.
  if (!node.hasAttribute('tabindex')) {
    node.setAttribute('tabindex', '-1');
  }

  node.focus({ preventScroll: true });
}
