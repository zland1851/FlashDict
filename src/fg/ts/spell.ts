/**
 * Spell - Rich text editor component for note editing
 */

type ExecCommand = (command: string, value?: string | null) => boolean;

/**
 * Create an HTML element with properties and children
 */
function $(
  tag: string,
  props: Record<string, unknown> = {},
  children: (HTMLElement | null)[] = []
): HTMLElement {
  const elm = document.createElement(tag);
  children.forEach(child => {
    if (child) {
      elm.appendChild(child);
    }
  });
  return Object.assign(elm, props);
}

/**
 * Ensure URL has HTTP(S) protocol
 */
function ensureHTTP(url: string): string {
  return /^https?:\//.test(url) ? url : `https://${url}`;
}

/**
 * Create the spell (rich text editor) component
 */
export function spell(): HTMLElement {
  const exec: ExecCommand = (command, value = null) =>
    document.execCommand(command, false, value ?? undefined);

  const buttons: Record<string, HTMLElement> = {};

  const queryState = (): void => {
    for (const cmd in buttons) {
      const button = buttons[cmd];
      if (button) {
        button.classList.toggle('selected', document.queryCommandState(cmd));
      }
    }
  };

  type ActionDef = [string, (() => void)?, HTMLElement?];

  const actions: ActionDef[][] = [
    [
      ['bold'],
      ['italic'],
      ['underline']
    ],
    [
      ['paragraph', () => exec('formatBlock', '<p>')],
      ['quote', () => exec('formatBlock', '<blockquote>')],
      ['code', () => exec('formatBlock', '<pre>')]
    ],
    [
      ['insertOrderedList'],
      ['insertUnorderedList'],
      ['insertHorizontalRule']
    ],
    [
      ['removeFormat'],
      ['unlink']
    ],
    [
      ['link', () => {
        const linkUrl = prompt('Enter the link URL');
        if (linkUrl) exec('createLink', ensureHTTP(linkUrl));
      }],
      ['image', () => {
        const imgUrl = prompt('Enter the image URL');
        if (imgUrl) exec('insertImage', ensureHTTP(imgUrl));
      }]
    ],
    [
      ['undo'],
      ['redo']
    ]
  ];

  return $('div', { className: 'spell' }, [
    $('div', { className: 'spell-bar' }, actions.map(bar =>
      $('div', { className: 'spell-zone' }, bar.map(([cmd, onclick]) => {
        const button = $('button', {
          className: 'spell-icon',
          title: cmd.replace(/([^a-z])/g, ' $1').toLowerCase(),
          onclick: onclick || (() => exec(cmd))
        }, [$('i', { className: 'icon-' + cmd.toLowerCase() })]);
        buttons[cmd] = button;
        return button;
      }))
    )),
    $('div', {
      className: 'spell-content',
      contentEditable: 'true',
      onkeydown: (event: KeyboardEvent) => {
        if (event.which === 9) {
          event.preventDefault();
        }
      },
      onkeyup: queryState,
      onmouseup: queryState
    })
  ]);
}

export default spell;
