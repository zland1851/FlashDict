/**
 * Frontend - Main content script for ODH extension
 */

import { Popup } from './popup.js';
import { rangeFromPoint, TextSourceRange } from './range.js';
import { selectedText, isEmpty, getSentence, isValidElement } from './utils/text.js';
import { isConnected, addNote, getTranslation, playAudio } from './api.js';

interface Point {
  x: number;
  y: number;
}

interface ExtensionOptions {
  enabled: boolean;
  mouseselection: boolean;
  hotkey: string;
  maxcontext: string;
  services: string;
  monolingual: string;
  [key: string]: unknown;
}

interface NoteDefinition {
  css: string;
  expression: string;
  reading: string;
  extrainfo: string;
  definitions: string[];
  definition?: string;
  sentence: string;
  url: string;
  audios: string[];
}

interface MessageRequest {
  action: string;
  params: Record<string, unknown> & { callback?: () => void };
}

/**
 * ODH Frontend class - handles text selection and popup display
 */
class ODHFront {
  private options: ExtensionOptions | null = null;
  private point: Point | null = null;
  private notes: NoteDefinition[] | null = null;
  private sentence: string = '';
  private audio: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;
  private mouseselection: boolean = true;
  private activateKey: number = 16; // shift 16, ctrl 17, alt 18
  private exitKey: number = 27; // esc 27
  private maxContext: number = 1;
  private popup: Popup = new Popup();
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private mousemoved: boolean = false;

  constructor() {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
    window.addEventListener('message', (e) => this.onFrameMessage(e));
    document.addEventListener('selectionchange', (e) => this.userSelectionChanged(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.activateKey) return;
    if (!isValidElement()) return;

    if (
      this.enabled &&
      this.point !== null &&
      (e.keyCode === this.activateKey || e.charCode === this.activateKey)
    ) {
      const range = rangeFromPoint(this.point);
      if (range === null) return;
      const textSource = new TextSourceRange(range);
      textSource.selectText();
      this.mousemoved = false;
      this.onSelectionEnd();
    }

    if (e.keyCode === this.exitKey || e.charCode === this.exitKey) {
      this.popup.hide();
    }
  }

  private onDoubleClick(_e: MouseEvent): void {
    if (!this.mouseselection) return;
    if (!isValidElement()) return;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.mousemoved = false;
    this.onSelectionEnd();
  }

  private onMouseDown(_e: MouseEvent): void {
    this.popup.hide();
  }

  private onMouseMove(e: MouseEvent): void {
    this.mousemoved = true;
    this.point = {
      x: e.clientX,
      y: e.clientY,
    };
  }

  private userSelectionChanged(_e: Event): void {
    if (!this.enabled || !this.mousemoved || !this.mouseselection) return;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.onSelectionEnd();
    }, 500);
  }

  private async onSelectionEnd(): Promise<void> {
    if (!this.enabled) return;
    if (!isValidElement()) return;

    this.timeout = null;
    const expression = selectedText();
    if (isEmpty(expression)) return;

    const result = await getTranslation(expression);
    if (result === null || (Array.isArray(result) && result.length === 0)) return;

    this.notes = this.buildNote(result);
    if (this.point) {
      this.popup.showNextTo(
        { x: this.point.x, y: this.point.y },
        await this.renderPopup(this.notes)
      );
    }
  }

  private onBgMessage(
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    callback: () => void
  ): void {
    const { action, params } = request;
    const methodName = 'api_' + action;

    if (methodName === 'api_setFrontendOptions') {
      params.callback = callback;
      this.api_setFrontendOptions(params as { options: ExtensionOptions; callback: () => void });
    }

    callback();
  }

  private api_setFrontendOptions(params: {
    options: ExtensionOptions;
    callback?: () => void;
  }): void {
    const { options, callback } = params;
    this.options = options;
    this.enabled = options.enabled;
    this.mouseselection = options.mouseselection;
    this.activateKey = Number(options.hotkey);
    this.maxContext = Number(options.maxcontext);
    // Note: options.services is handled by this.options reference
    callback?.();
  }

  private onFrameMessage(e: MessageEvent): void {
    const { action, params } = e.data as MessageRequest;

    switch (action) {
      case 'addNote':
        this.api_addNote(params as { nindex: number; dindex: number; context: string });
        break;
      case 'playAudio':
        this.api_playAudio(params as { nindex: number; dindex: number });
        break;
      case 'playSound':
        this.api_playSound(params as { sound: string });
        break;
    }
  }

  private async api_addNote(params: {
    nindex: number;
    dindex: number;
    context: string;
  }): Promise<void> {
    const { nindex, dindex, context } = params;

    if (!this.notes || !this.notes[nindex]) return;

    const notedef: Record<string, unknown> = { ...this.notes[nindex] };
    notedef.definition = this.notes[nindex].css + this.notes[nindex].definitions[dindex];
    notedef.definitions = this.notes[nindex].css + this.notes[nindex].definitions.join('<hr>');
    notedef.sentence = context;
    notedef.url = window.location.href;

    const response = await addNote(notedef);
    this.popup.sendMessage('setActionState', { response, params });
  }

  private async api_playAudio(params: { nindex: number; dindex: number }): Promise<void> {
    const { nindex, dindex } = params;

    if (!this.notes || !this.notes[nindex] || !this.notes[nindex].audios[dindex]) return;

    const url = this.notes[nindex].audios[dindex];
    await playAudio(url);
  }

  private api_playSound(params: { sound: string }): void {
    const url = params.sound;

    for (const key in this.audio) {
      this.audio[key]?.pause();
    }

    const audio = this.audio[url] || new Audio(url);
    audio.currentTime = 0;
    audio.play();

    this.audio[url] = audio;
  }

  private buildNote(result: unknown): NoteDefinition[] {
    const expression = selectedText();
    const sentence = getSentence(this.maxContext) ?? '';
    this.sentence = sentence;

    const tmpl: NoteDefinition = {
      css: '',
      expression,
      reading: '',
      extrainfo: '',
      definitions: [],
      sentence: sentence,
      url: '',
      audios: [],
    };

    if (Array.isArray(result)) {
      for (const item of result) {
        for (const key in tmpl) {
          if (!(key in item) || item[key] === undefined) {
            item[key] = tmpl[key as keyof NoteDefinition];
          }
        }
      }
      return result as NoteDefinition[];
    } else {
      tmpl.definitions = [String(result)];
      return [tmpl];
    }
  }

  private async renderPopup(notes: NoteDefinition[]): Promise<string> {
    let content = '';
    const currentServices = this.options?.services || '';
    let image = '';
    let imageclass = '';

    if (currentServices !== 'none') {
      image = currentServices === 'ankiconnect' ? 'plus.png' : 'cloud.png';
      const connected = await isConnected();
      imageclass = connected ? 'class="odh-addnote"' : 'class="odh-addnote-disabled"';
    }

    for (const [nindex, note] of notes.entries()) {
      content += note.css + '<div class="odh-note">';

      let audiosegment = '';
      if (note.audios) {
        for (const [dindex, audio] of note.audios.entries()) {
          if (audio) {
            audiosegment += `<img class="odh-playaudio" data-nindex="${nindex}" data-dindex="${dindex}" src="${chrome.runtime.getURL('fg/img/play.png')}"/>`;
          }
        }
      }

      content += `
        <div class="odh-headsection">
          <span class="odh-audios">${audiosegment}</span>
          <span class="odh-expression">${note.expression}</span>
          <span class="odh-reading">${note.reading}</span>
          <span class="odh-extra">${note.extrainfo}</span>
        </div>`;

      for (const [dindex, definition] of note.definitions.entries()) {
        const button =
          currentServices === 'none' || currentServices === ''
            ? ''
            : `<img ${imageclass} data-nindex="${nindex}" data-dindex="${dindex}" src="${chrome.runtime.getURL('fg/img/' + image)}" />`;
        content += `<div class="odh-definition">${button}${definition}</div>`;
      }
      content += '</div>';
    }

    content += '<div id="odh-container" class="odh-sentence"></div>';
    return this.popupHeader() + content + this.popupFooter();
  }

  private popupHeader(): string {
    const root = chrome.runtime.getURL('/');
    return `
      <html lang="en">
        <head><meta charset="UTF-8"><title></title>
          <link rel="stylesheet" href="${root}fg/css/frame.css">
          <link rel="stylesheet" href="${root}fg/css/spell.css">
        </head>
        <body style="margin:0px;">
        <div class="odh-notes">`;
  }

  private popupFooter(): string {
    const root = chrome.runtime.getURL('/');
    const services = this.options?.services || '';
    const image = services === 'ankiconnect' ? 'plus.png' : 'cloud.png';
    const button = chrome.runtime.getURL('fg/img/' + image);
    const monolingual = this.options?.monolingual === '1' ? 1 : 0;

    return `
        </div>
        <div class="icons hidden">
          <img id="plus" src="${button}"/>
          <img id="load" src="${root}fg/img/load.gif"/>
          <img id="good" src="${root}fg/img/good.png"/>
          <img id="fail" src="${root}fg/img/fail.png"/>
          <img id="play" src="${root}fg/img/play.png"/>
          <div id="context">${this.sentence}</div>
          <div id="monolingual">${monolingual}</div>
        </div>
        <script src="${root}fg/js/spell.js"></script>
        <script src="${root}fg/js/frame.js"></script>
        </body>
      </html>`;
  }
}

// Initialize the frontend
(window as Window & { odhfront?: ODHFront }).odhfront = new ODHFront();

export { ODHFront };
