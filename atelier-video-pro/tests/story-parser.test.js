/**
 * Mini-test Story Parser — sans navigateur / sans clé API.
 * Usage : node tests/story-parser.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadScript(filename, sandbox) {
  const code = fs.readFileSync(path.join(root, filename), 'utf8');
  vm.runInContext(code, sandbox, { filename: filename });
}

const localStore = {};
const sandbox = {
  window: {},
  console: console,
  Math: Math,
  Date: Date,
  JSON: JSON,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.window = sandbox;
sandbox.localStorage = sandbox.localStorage;

vm.createContext(sandbox);

loadScript('config.js', sandbox);
loadScript('character-bible.js', sandbox);
loadScript('story-parser.js', sandbox);

const DEMO = sandbox.window.CONFIG.DEMO_SCRIPT;
const plan = sandbox.window.StoryParser.parseStory(DEMO, '1min', 'cinematic');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('✗ ' + msg);
  } else {
    console.log('✓ ' + msg);
  }
}

assert(plan.meta.targetClips === 6, '1min → 6 clips cibles');
assert(plan.scenes.length === 6, '6 scènes générées (reçu ' + plan.scenes.length + ')');
assert(plan.characters.length >= 1, 'au moins 1 personnage');
assert(plan.scenes.every((s) => s.imagePrompt && s.motionPrompt), 'chaque scène a imagePrompt + motionPrompt');
assert(plan.scenes.every((s) => s.emotion), 'chaque scène a une émotion');
assert(plan.scenes[0].previousSceneId === null, 'première scène sans précédent');
assert(plan.scenes[0].nextSceneId === plan.scenes[1].id, 'chaînage scène 1 → 2');
assert(plan.meta.isLong === false, '1min n’est pas « long » (>60s)');

const bible = sandbox.window.CharacterBible.all();
assert(bible.length >= 1, 'bible personnages alimentée');
assert(bible.every((c) => typeof c.styleSeed === 'number'), 'seeds fixes présents');

const shortPlan = sandbox.window.StoryParser.parseStory(DEMO, '5s', 'anime');
assert(shortPlan.scenes.length === 1, '5s → 1 clip');

const longPlan = sandbox.window.StoryParser.parseStory(DEMO, '5min', 'cinematic');
assert(longPlan.meta.targetClips === 30, '5min → 30 clips');
assert(longPlan.meta.isLong === true, '5min est long');
assert(longPlan.chapters.length > 0, 'chapitres créés en mode long');

if (failed) {
  console.error('\n' + failed + ' test(s) échoué(s)');
  process.exit(1);
}
console.log('\nTous les tests Story Parser OK');
