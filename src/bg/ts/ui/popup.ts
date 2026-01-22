/**
 * Popup Page Logic
 * Handles the extension popup UI functionality
 */

import {
  ExtensionOptions,
  odhback,
  localizeHtmlPage,
  utilAsync,
  optionsLoad,
  optionsSave
} from './utils.js';

// jQuery is loaded globally via script tag
declare const $: JQueryStatic;

/**
 * Populate Anki deck dropdown
 */
async function populateAnkiDeckAndModel(options: ExtensionOptions): Promise<void> {
  $('#deckname').empty();
  const names = await odhback().opt_getDeckNames();
  if (names !== null) {
    names.forEach((name) => {
      $('#deckname').append($('<option>', { value: name, text: name }));
    });
  }
  $('#deckname').val(options.deckname);
}

/**
 * Populate dictionary dropdown
 */
function populateDictionary(dicts: Array<{ objectname: string; displayname: string }>): void {
  $('#dict').empty();
  dicts.forEach((item) => {
    $('#dict').append($('<option>', { value: item.objectname, text: item.displayname }));
  });
}

/**
 * Update Anki connection status
 */
async function updateAnkiStatus(options: ExtensionOptions): Promise<void> {
  const version = await odhback().opt_getVersion();
  if (version === null) {
    $('.anki-options').hide();
  } else {
    await populateAnkiDeckAndModel(options);
    $('.anki-options').show();
  }
}

/**
 * Handle option changes
 */
async function onOptionChanged(e: JQuery.ChangeEvent): Promise<void> {
  if (!e.originalEvent) return;

  const options = await optionsLoad();

  options.enabled = $('#enabled').prop('checked') as boolean;
  options.mouseselection = $('#mouseselection').prop('checked') as boolean;
  options.hotkey = $('#hotkey').val() as string;
  options.dictSelected = $('#dict').val() as string;
  options.deckname = $('#deckname').val() as string;
  options.tags = $('#tags').val() as string;

  const newOptions = await odhback().opt_optionsChanged(options);
  await optionsSave(newOptions);
}

/**
 * Open full options page
 */
function onMoreOptions(): void {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

/**
 * Initialize popup page
 */
async function onReady(): Promise<void> {
  localizeHtmlPage();

  const options = await optionsLoad();

  $('#enabled').prop('checked', options.enabled);
  $('#mouseselection').prop('checked', options.mouseselection);
  $('#hotkey').val(options.hotkey);
  populateDictionary(options.dictNamelist);
  $('#dict').val(options.dictSelected);
  $('#deckname').val(options.deckname);
  $('#tags').val(options.tags);

  $('#enabled').on('change', onOptionChanged);
  $('#mouseselection').on('change', onOptionChanged);
  $('#hotkey').on('change', onOptionChanged);
  $('#dict').on('change', onOptionChanged);
  $('#deckname').on('change', onOptionChanged);
  $('#tags').on('change', onOptionChanged);

  $('#more').on('click', onMoreOptions);

  $('.anki-options').hide();
  await updateAnkiStatus(options);
}

// Initialize when document is ready
$(document).ready(utilAsync(onReady));
