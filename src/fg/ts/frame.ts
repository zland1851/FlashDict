/**
 * Frame script - Handles communication within the popup iframe
 */

import { spell } from './spell.js';
import { throttle } from './utils/throttle.js';

interface MessageData {
  action: string;
  params: Record<string, unknown>;
}

interface ActionStateResult {
  response: boolean;
  params: {
    nindex: string;
    dindex: string;
  };
}

/**
 * Get image source from an element by ID
 */
function getImageSource(id: string): string {
  const img = document.querySelector(`#${id}`) as HTMLImageElement | null;
  return img?.src || '';
}

/**
 * Register click handlers for add note buttons
 */
function registerAddNoteLinks(): void {
  const links = document.getElementsByClassName('odh-addnote');
  for (const link of Array.from(links)) {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLImageElement;
      const ds = target.dataset;
      target.src = getImageSource('load');

      const spellContent = document.querySelector('.spell-content');
      window.parent.postMessage(
        {
          action: 'addNote',
          params: {
            nindex: ds.nindex,
            dindex: ds.dindex,
            context: spellContent?.innerHTML || '',
          },
        },
        '*'
      );
    });
  }
}

/**
 * Register click handlers for audio play buttons
 */
function registerAudioLinks(): void {
  const links = document.getElementsByClassName('odh-playaudio');
  for (const link of Array.from(links)) {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const ds = target.dataset;
      window.parent.postMessage(
        {
          action: 'playAudio',
          params: {
            nindex: ds.nindex,
            dindex: ds.dindex,
          },
        },
        '*'
      );
    });
  }
}

/**
 * Register click handlers for sound play buttons
 */
function registerSoundLinks(): void {
  const links = document.getElementsByClassName('odh-playsound');
  for (const link of Array.from(links)) {
    const img = link as HTMLImageElement;
    img.setAttribute('src', getImageSource('play'));
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const ds = target.dataset;
      window.parent.postMessage(
        {
          action: 'playSound',
          params: {
            sound: ds.sound,
          },
        },
        '*'
      );
    });
  }
}

/**
 * Initialize spell editor and translation content
 */
function initSpellnTranslation(): void {
  const container = document.querySelector('#odh-container');
  if (container) {
    container.appendChild(spell());
  }

  const spellContent = document.querySelector('.spell-content');
  const contextEl = document.querySelector('#context');
  if (spellContent && contextEl) {
    spellContent.innerHTML = contextEl.innerHTML;
  }

  const monolingualEl = document.querySelector('#monolingual');
  if (monolingualEl?.textContent === '1') {
    hideTranslation();
  }
}

/**
 * Register click handlers to toggle translation visibility
 */
function registerHiddenClass(): void {
  const divs = document.getElementsByClassName('odh-definition');
  for (const div of Array.from(divs)) {
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      hideTranslation();
    });
  }
}

/**
 * Toggle visibility of translation elements
 */
function hideTranslation(): void {
  const className = 'span.chn_dis, span.chn_tran, span.chn_sent, span.tgt_tran, span.tgt_sent';
  const elements = document.querySelectorAll(className);
  for (const el of Array.from(elements)) {
    el.classList.toggle('hidden');
  }
}

/**
 * Handle DOM content loaded event
 */
function onDomContentLoaded(): void {
  registerAddNoteLinks();
  registerAudioLinks();
  registerSoundLinks();
  registerHiddenClass();
  initSpellnTranslation();
}

/**
 * Handle messages from parent window
 */
function onMessage(e: MessageEvent<MessageData>): void {
  const { action, params } = e.data;
  const methodName = 'api_' + action;

  if (methodName === 'api_setActionState') {
    api_setActionState(params as unknown as ActionStateResult);
  }
}

/**
 * API: Set action state after note addition
 */
function api_setActionState(result: ActionStateResult): void {
  const { response, params } = result;
  const { nindex, dindex } = params;

  const match = document.querySelector(
    `.odh-addnote[data-nindex="${nindex}"].odh-addnote[data-dindex="${dindex}"]`
  ) as HTMLImageElement | null;

  if (!match) return;

  if (response) {
    match.src = getImageSource('good');
  } else {
    match.src = getImageSource('fail');
  }

  setTimeout(() => {
    match.src = getImageSource('plus');
  }, 1000);
}

/**
 * Handle mouse wheel events for scrolling
 */
function onMouseWheel(e: WheelEvent): void {
  const html = document.querySelector('html');
  const body = document.querySelector('body');

  if (html) {
    html.scrollTop -= (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
      ? (e as WheelEvent & { wheelDeltaY: number }).wheelDeltaY / 3
      : -e.deltaY / 3;
  }
  if (body) {
    body.scrollTop -= (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
      ? (e as WheelEvent & { wheelDeltaY: number }).wheelDeltaY / 3
      : -e.deltaY / 3;
  }
  e.preventDefault();
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', onDomContentLoaded, false);
window.addEventListener('message', onMessage);

// Throttle wheel events to ~60fps (16ms) for performance while keeping passive: false for preventDefault
const throttledWheelHandler = throttle(onMouseWheel, 16);
window.addEventListener('wheel', throttledWheelHandler, { passive: false });
