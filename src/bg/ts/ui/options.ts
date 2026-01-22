/* eslint-disable @typescript-eslint/no-explicit-any */
// These functions are provided by utils.js loaded via script tag
declare const odhback: () => {
  opt_getDeckNames(): Promise<string[] | null>;
  opt_getModelNames(): Promise<string[] | null>;
  opt_getModelFieldNames(modelName: string): Promise<string[] | null>;
  opt_getVersion(): Promise<string | null>;
  opt_optionsChanged(options: Options): Promise<Options>;
  ankiweb: {
    initConnection(options: Options, forceLogout: boolean): Promise<void>;
  };
};
declare const localizeHtmlPage: () => void;
declare const utilAsync: <T>(fn: () => Promise<T>) => () => void;
declare const optionsLoad: () => Promise<Options>;

interface DictItem {
  objectname: string;
  displayname: string;
}

interface Options {
  enabled: boolean;
  mouseselection: boolean;
  hotkey: string;
  dictSelected: string;
  dictNamelist: DictItem[];
  monolingual: string;
  preferredaudio: string;
  maxcontext: string;
  maxexample: string;
  services: string;
  id: string;
  password: string;
  tags: string;
  duplicate: string;
  deckname: string;
  typename: string;
  expression: string;
  reading: string;
  extrainfo: string;
  definition: string;
  definitions: string;
  sentence: string;
  url: string;
  audio: string;
  sysscripts: string;
  udfscripts: string;
  [key: string]: string | boolean | DictItem[];
}

async function populateAnkiDeckAndModel(options: Options): Promise<void> {
  let names: string[] | null = [];
  $('#deckname').empty();
  names = await odhback().opt_getDeckNames();
  if (names !== null) {
    names.forEach((name) => $('#deckname').append($('<option>', { value: name, text: name })));
  }
  $('#deckname').val(options.deckname);

  $('#typename').empty();
  names = await odhback().opt_getModelNames();
  if (names !== null) {
    names.forEach((name) => $('#typename').append($('<option>', { value: name, text: name })));
  }
  $('#typename').val(options.typename);
}

async function populateAnkiFields(options: Options): Promise<void> {
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
    'audio',
  ];
  fields.forEach((field) => {
    $(`#${field}`).empty();
    $(`#${field}`).append($('<option>', { value: '', text: '' }));
    names.forEach((name) => $(`#${field}`).append($('<option>', { value: name, text: name })));
    $(`#${field}`).val(options[field] as string);
  });
}

async function updateAnkiStatus(options: Options): Promise<void> {
  $('#services-status').removeClass('connected').text(chrome.i18n.getMessage('msgConnecting'));
  $('#anki-options').hide();
  if (options.services === 'ankiweb') {
    $('#user-options').css('display', 'block');
  } else {
    $('#user-options').css('display', 'none');
  }

  // If no service selected, just show not connected
  if (options.services === 'none') {
    $('#services-status').text('Not Connected');
    return;
  }

  const version = await odhback().opt_getVersion();
  if (version === null) {
    $('#services-status')
      .removeClass('connected')
      .text(chrome.i18n.getMessage('msgFailed') || 'Not Connected');
  } else {
    populateAnkiDeckAndModel(options);
    populateAnkiFields(options);
    $('#services-status')
      .addClass('connected')
      .text(chrome.i18n.getMessage('msgSuccess', [version]) || 'Connected ' + version);
    $('#anki-options').show();
    if (options.services === 'ankiconnect') $('#duplicate-option').show();
    else {
      $('#duplicate-option').hide();
    }
  }
}

function populateDictionary(dicts: DictItem[]): void {
  $('#dict').empty();
  dicts.forEach((item) =>
    $('#dict').append($('<option>', { value: item.objectname, text: item.displayname }))
  );
}

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
    'general_Makenotes', //default & builtin script
    'cncn_Zdic', //cn-cn dictionary
    'encn_Collins',
    'encn_Cambridge',
    'encn_Cambridge_tc',
    'encn_Oxford',
    'encn_Youdao',
    'encn_Baicizhan', //en-cn dictionaries
    'enen_Collins',
    'enen_LDOCE6MDX',
    'enen_UrbanDict', //en-en dictionaries
    'enfr_Cambridge',
    'enfr_Collins', //en-fr dictionaries
    'fren_Cambridge',
    'fren_Collins', //fr-cn dictionaries
    'esen_Spanishdict',
    'decn_Eudict',
    'escn_Eudict',
    'frcn_Eudict',
    'frcn_Youdao',
    'rucn_Qianyi', //msci dictionaries
  ];
  $('#scriptslistbody').empty();
  systemscripts.forEach((script) => {
    let row = '';
    row += `<input class="sl-col sl-col-onoff" type="checkbox" ${optionscripts.includes(script) || optionscripts.includes('lib://' + script) ? 'checked' : ''}>`;
    row += `<input class="sl-col sl-col-cloud hidden" type="checkbox" ${optionscripts.includes('lib://' + script) ? 'checked' : ''}>`;
    row += `<span class="sl-col sl-col-name">${script}</span>`;
    row += `<span class="sl-col sl-col-description">${chrome.i18n.getMessage(script)}</span>`;
    $('#scriptslistbody').append($(`<div class="sl-row">${row}</div>`));
  });

  $('.sl-col-onoff', '.sl-row:nth-child(1)').prop('checked', true); // make default script(first row) always active.
  $('.sl-col-cloud', '.sl-row:nth-child(1)').prop('checked', false); // make default script(first row) as local script.
  $('.sl-col-cloud, .sl-col-onoff', '.sl-row:nth-child(1)').css({ visibility: 'hidden' }); //make default sys script untouch
}

function onScriptListChange(): void {
  const dictLibrary: string[] = [];
  $('.sl-row').each(function () {
    if ($('.sl-col-onoff', this).prop('checked') === true)
      dictLibrary.push(
        $('.sl-col-cloud', this).prop('checked')
          ? 'lib://' + $('.sl-col-name', this).text()
          : $('.sl-col-name', this).text()
      );
  });
  $('#sysscripts').val(dictLibrary.join());
}

function onHiddenClicked(): void {
  $('.sl-col-cloud').toggleClass('hidden');
}

async function onAnkiTypeChanged(e: JQuery.ChangeEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    populateAnkiFields(options);
  }
}

async function onLoginClicked(e: JQuery.ClickEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    options.id = $('#id').val() as string;
    options.password = $('#password').val() as string;

    $('#services-status').text(chrome.i18n.getMessage('msgConnecting'));
    await odhback().ankiweb.initConnection(options, true); // set param forceLogout = true

    const newOptions = await odhback().opt_optionsChanged(options);
    updateAnkiStatus(newOptions);
  }
}

async function onServicesChanged(e: JQuery.ChangeEvent): Promise<void> {
  if (e.originalEvent) {
    const options = await optionsLoad();
    options.services = $('#services').val() as string;
    const newOptions = await odhback().opt_optionsChanged(options);
    updateAnkiStatus(newOptions);
  }
}

async function onSaveClicked(e: JQuery.ClickEvent): Promise<void> {
  if (!e.originalEvent) return;

  const optionsOld = await optionsLoad();
  const options = $.extend(true, {}, optionsOld) as Options;

  options.enabled = $('#enabled').prop('checked');
  options.mouseselection = $('#mouseselection').prop('checked');
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
    'audio',
  ];
  fields.forEach((field) => {
    const val = $(`#${field}`).val();
    if (val != null) {
      (options as any)[field] = val as string;
    }
  });

  options.sysscripts = $('#sysscripts').val() as string;
  options.udfscripts = $('#udfscripts').val() as string;

  $('#gif-load').show();
  const newOptions = await odhback().opt_optionsChanged(options);
  $('.gif').hide();
  $('#gif-good').show(1000, () => {
    $('.gif').hide();
  });

  populateDictionary(newOptions.dictNamelist);
  $('#dict').val(newOptions.dictSelected);

  if (e.target.id === 'saveclose') window.close();
}

function onCloseClicked(_e: JQuery.ClickEvent): void {
  window.close();
}

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
    'audio',
  ];
  fields.forEach((field) => {
    $(`#${field}`).val(options[field] as string);
  });

  $('#sysscripts').val(options.sysscripts);
  $('#udfscripts').val(options.udfscripts);
  populateSysScriptsList(options.sysscripts);
  onHiddenClicked();

  $('#login').click(onLoginClicked);
  $('#saveload').click(onSaveClicked);
  $('#saveclose').click(onSaveClicked);
  $('#close').click(onCloseClicked);
  $('.gif').hide();

  $('.sl-col-onoff, .sl-col-cloud').click(onScriptListChange);
  $('#hidden').click(onHiddenClicked);
  $('#typename').change(onAnkiTypeChanged);
  $('#services').change(onServicesChanged);

  updateAnkiStatus(options);
}

$(document).ready(utilAsync(onReady));
