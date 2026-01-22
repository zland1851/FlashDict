/**
 * Options Page Logic
 * Handles the extension options page UI functionality
 */

import {
  ExtensionOptions,
  odhback,
  localizeHtmlPage,
  utilAsync,
  optionsLoad
} from './utils.js';

// jQuery is loaded globally via script tag
declare const $: JQueryStatic;

/**
 * Populate Anki deck and model dropdowns
 */
async function populateAnkiDeckAndModel(options: ExtensionOptions): Promise<void> {
  $('#deckname').empty();
  let names = await odhback().opt_getDeckNames();
  if (names !== null) {
    names.forEach((name) => {
      $('#deckname').append($('<option>', { value: name, text: name }));
    });
  }
  $('#deckname').val(options.deckname);

  $('#typename').empty();
  names = await odhback().opt_getModelNames();
  if (names !== null) {
    names.forEach((name) => {
      $('#typename').append($('<option>', { value: name, text: name }));
    });
  }
  $('#typename').val(options.typename);
}

/**
 * Populate Anki field mappings
 */
async function populateAnkiFields(options: ExtensionOptions): Promise<void> {
  const modelName = ($('#typename').val() as string) || options.typename;
  if (modelName === null) return;

  const names = await odhback().opt_getModelFieldNames(modelName);
  if (names === null) return;

  const fields = [
    'expression',
    'reading',
    'extrainfo',
    'definition',
    'definitions',
    'sentence',
    'url',
    'audio'
  ];

  fields.forEach((field) => {
    $(`#${field}`).empty();
    $(`#${field}`).append($('<option>', { value: '', text: '' }));
    names.forEach((name) => {
      $(`#${field}`).append($('<option>', { value: name, text: name }));
    });
    $(`#${field}`).val((options as unknown as Record<string, unknown>)[field] as string);
  });
}

/**
 * Update Anki connection status
 */
async function updateAnkiStatus(options: ExtensionOptions): Promise<void> {
  $('#services-status').text(chrome.i18n.getMessage('msgConnecting'));
  $('#anki-options').hide();

  if (options.services === 'ankiweb') {
    $('#user-options').show();
  } else {
    $('#user-options').hide();
  }

  const version = await odhback().opt_getVersion();
  if (version === null) {
    $('#services-status').text(chrome.i18n.getMessage('msgFailed'));
  } else {
    await populateAnkiDeckAndModel(options);
    await populateAnkiFields(options);
    $('#services-status').text(chrome.i18n.getMessage('msgSuccess', [version]));
    $('#anki-options').show();

    if (options.services === 'ankiconnect') {
      $('#duplicate-option').show();
    } else {
      $('#duplicate-option').hide();
    }
  }
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
 * Populate system scripts list
 */
function populateSysScriptsList(dictLibrary: string): void {
  const optionscripts = Array.from(
    new Set(
      dictLibrary
        .split(',')
        .filter((x) => x)
        .map((x) => x.trim())
    )
  );

  const systemscripts = [
    'builtin_encn_Collins',
    'general_Makenotes',
    'cncn_Zdic',
    'encn_Collins',
    'encn_Cambridge',
    'encn_Cambridge_tc',
    'encn_Oxford',
    'encn_Youdao',
    'encn_Baicizhan',
    'enen_Collins',
    'enen_LDOCE6MDX',
    'enen_UrbanDict',
    'enfr_Cambridge',
    'enfr_Collins',
    'fren_Cambridge',
    'fren_Collins',
    'esen_Spanishdict',
    'decn_Eudict',
    'escn_Eudict',
    'frcn_Eudict',
    'frcn_Youdao',
    'rucn_Qianyi'
  ];

  $('#scriptslistbody').empty();

  systemscripts.forEach((script) => {
    const isChecked = optionscripts.includes(script) || optionscripts.includes('lib://' + script);
    const isCloud = optionscripts.includes('lib://' + script);

    let row = '';
    row += `<input class="sl-col sl-col-onoff" type="checkbox" ${isChecked ? 'checked' : ''}>`;
    row += `<input class="sl-col sl-col-cloud hidden" type="checkbox" ${isCloud ? 'checked' : ''}>`;
    row += `<span class="sl-col sl-col-name">${script}</span>`;
    row += `<span class="sl-col sl-col-description">${chrome.i18n.getMessage(script)}</span>`;
    $('#scriptslistbody').append($(`<div class="sl-row">${row}</div>`));
  });

  // Make default script (first row) always active
  $('.sl-col-onoff', '.sl-row:nth-child(1)').prop('checked', true);
  $('.sl-col-cloud', '.sl-row:nth-child(1)').prop('checked', false);
  $('.sl-col-cloud, .sl-col-onoff', '.sl-row:nth-child(1)').css({ visibility: 'hidden' });
}

/**
 * Handle script list changes
 */
function onScriptListChange(): void {
  const dictLibrary: string[] = [];

  $('.sl-row').each(function () {
    if ($('.sl-col-onoff', this).prop('checked') === true) {
      const scriptName = $('.sl-col-name', this).text();
      const isCloud = $('.sl-col-cloud', this).prop('checked');
      dictLibrary.push(isCloud ? 'lib://' + scriptName : scriptName);
    }
  });

  $('#sysscripts').val(dictLibrary.join());
}

/**
 * Toggle cloud column visibility
 */
function onHiddenClicked(): void {
  $('.sl-col-cloud').toggleClass('hidden');
}

/**
 * Handle Anki type change
 */
async function onAnkiTypeChanged(e: JQuery.ChangeEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    await populateAnkiFields(options);
  }
}

/**
 * Handle login button click
 */
async function onLoginClicked(e: JQuery.ClickEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    options.id = $('#id').val() as string;
    options.password = $('#password').val() as string;

    $('#services-status').text(chrome.i18n.getMessage('msgConnecting'));
    await odhback().ankiweb.initConnection(options, true);

    const newOptions = await odhback().opt_optionsChanged(options);
    await updateAnkiStatus(newOptions);
  }
}

/**
 * Handle services dropdown change
 */
async function onServicesChanged(e: JQuery.ChangeEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    options.services = $('#services').val() as string;
    const newOptions = await odhback().opt_optionsChanged(options);
    await updateAnkiStatus(newOptions);
  }
}

/**
 * Handle save button click
 */
async function onSaveClicked(e: JQuery.ClickEvent): Promise<void> {
  if (!e.originalEvent) return;

  const optionsOld = await optionsLoad();
  const options = $.extend(true, {}, optionsOld) as ExtensionOptions;

  options.enabled = $('#enabled').prop('checked') as boolean;
  options.mouseselection = $('#mouseselection').prop('checked') as boolean;
  options.hotkey = $('#hotkey').val() as string;
  options.dictSelected = $('#dict').val() as string;
  options.monolingual = $('#monolingual').val() as string;
  options.preferredaudio = $('#anki-preferred-audio').val() as string;
  options.maxcontext = $('#maxcontext').val() as string;
  options.maxexample = $('#maxexample').val() as string;
  options.services = $('#services').val() as string;
  options.id = $('#id').val() as string;
  options.password = $('#password').val() as string;
  options.tags = $('#tags').val() as string;
  options.duplicate = $('#duplicate').val() as string;

  const fields = [
    'deckname',
    'typename',
    'expression',
    'reading',
    'extrainfo',
    'definition',
    'definitions',
    'sentence',
    'url',
    'audio'
  ];

  fields.forEach((field) => {
    const value = $(`#${field}`).val();
    if (value !== null && value !== undefined) {
      (options as unknown as Record<string, unknown>)[field] = value as string;
    }
  });

  options.sysscripts = $('#sysscripts').val() as string;
  options.udfscripts = $('#udfscripts').val() as string;

  $('#gif-load').show();
  const newOptions = await odhback().opt_optionsChanged(options);
  $('.gif').hide();
  $('#gif-good').show();
  setTimeout(() => $('.gif').hide(), 1000);

  populateDictionary(newOptions.dictNamelist);
  $('#dict').val(newOptions.dictSelected);

  if ((e.target as HTMLElement).id === 'saveclose') {
    window.close();
  }
}

/**
 * Handle close button click
 */
function onCloseClicked(): void {
  window.close();
}

/**
 * Initialize options page
 */
async function onReady(): Promise<void> {
  localizeHtmlPage();

  const options = await optionsLoad();

  $('#enabled').prop('checked', options.enabled);
  $('#mouseselection').prop('checked', options.mouseselection);
  $('#hotkey').val(options.hotkey);

  populateDictionary(options.dictNamelist);
  $('#dict').val(options.dictSelected);

  $('#monolingual').val(options.monolingual);
  $('#anki-preferred-audio').val(options.preferredaudio);
  $('#maxcontext').val(options.maxcontext);
  $('#maxexample').val(options.maxexample);

  $('#services').val(options.services);
  $('#id').val(options.id);
  $('#password').val(options.password);

  $('#tags').val(options.tags);
  $('#duplicate').val(options.duplicate);

  const fields = [
    'deckname',
    'typename',
    'expression',
    'reading',
    'extrainfo',
    'definition',
    'definitions',
    'sentence',
    'url',
    'audio'
  ];

  fields.forEach((field) => {
    $(`#${field}`).val((options as unknown as Record<string, unknown>)[field] as string);
  });

  $('#sysscripts').val(options.sysscripts);
  $('#udfscripts').val(options.udfscripts);
  populateSysScriptsList(options.sysscripts);
  onHiddenClicked();

  $('#login').on('click', onLoginClicked);
  $('#saveload').on('click', onSaveClicked);
  $('#saveclose').on('click', onSaveClicked);
  $('#close').on('click', onCloseClicked);
  $('.gif').hide();

  $('.sl-col-onoff, .sl-col-cloud').on('click', onScriptListChange);
  $('#hidden').on('click', onHiddenClicked);
  $('#typename').on('change', onAnkiTypeChanged);
  $('#services').on('change', onServicesChanged);

  await updateAnkiStatus(options);
}

// Initialize when document is ready
$(document).ready(utilAsync(onReady));
