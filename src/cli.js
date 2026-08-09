const SCENE_EXT_RE = /\.(json|propscene)$/i;
// --x / --y, in either the "--x 120" or "--x=120" form.
const COORD_RE = /^--([xy])(?:=(.*))?$/;
const INTEGER_RE = /^-?\d+$/;

// Strict on purpose: a value that is not plainly an integer is left unset
// rather than silently coerced, so "--x --borderless" does not eat the flag.
function integerOrNull(text) {
  return typeof text === 'string' && INTEGER_RE.test(text) ? Number(text) : null;
}

export function parseCli(argv) {
  const args = argv.slice(2);
  let sceneFile = null;
  let screenshot = null;
  let borderless = false;
  let url = null;
  const position = { x: null, y: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const coord = COORD_RE.exec(arg);

    if (arg === '--borderless') {
      borderless = true;
    } else if (coord) {
      const [, axis, inline] = coord;
      let value = integerOrNull(inline);
      if (value === null && inline === undefined) {
        value = integerOrNull(args[i + 1]);
        if (value !== null) i++;
      }
      if (value !== null) position[axis] = value;
    } else if (arg.startsWith('--url=')) {
      url = arg.slice('--url='.length);
    } else if (arg === '--url') {
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        url = next;
        i++;
      }
    } else if (arg.startsWith('--screenshot=')) {
      screenshot = arg.slice('--screenshot='.length);
    } else if (arg === '--screenshot') {
      const next = args[i + 1];
      if (next && !next.startsWith('--') && !SCENE_EXT_RE.test(next)) {
        screenshot = next;
        i++;
      } else {
        screenshot = 'screenshot.png';
      }
    } else if (!arg.startsWith('--') && SCENE_EXT_RE.test(arg) && sceneFile === null) {
      sceneFile = arg;
    }
  }

  return { sceneFile, screenshot, borderless, url, x: position.x, y: position.y };
}
