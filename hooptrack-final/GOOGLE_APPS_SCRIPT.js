// ═══════════════════════════════════════════════════════════════
// HoopTrack — Google Apps Script  (clean rebuild)
// 1. Open script.google.com
// 2. Create a new project called HoopTrack
// 3. Delete all existing code and paste this entire file
// 4. Save (Ctrl+S)
// 5. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Authorise when prompted
// 7. Copy the Web App URL into the HoopTrack app settings
// ═══════════════════════════════════════════════════════════════

var SS_NAME = 'HoopTrack';

// ── Entry points ────────────────────────────────────────────────
function doGet(e)  { return respond(route(e.parameter || {}, {})); }
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch(x) {}
  return respond(route(e.parameter || {}, body));
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(params, body) {
  var action = params.action || body.action || '';
  try {
    switch (action) {
      case 'ping':          return { ok: true };
      case 'setup':         return setup();
      case 'getAllPlayers': return getAllPlayers();
      case 'savePlayer':    return savePlayer(body.player);
      case 'addPlayer':     return addPlayer(body.player);
      case 'removePlayer':  return removePlayer(body.name);
      case 'getSettings':   return getSettings();
      case 'saveSettings':  return saveSettings(body);
      default:              return { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// ── Sheet helpers ────────────────────────────────────────────────
function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SS_NAME);
  if (!sheet) { sheet = ss.insertSheet(SS_NAME); }
  return sheet;
}

// Returns all data rows as objects: { name, key, value, rowIndex }
function readAllRows() {
  var sheet  = getSheet();
  var values = sheet.getDataRange().getValues();
  var rows   = [];
  for (var i = 1; i < values.length; i++) {
    var n = String(values[i][0] || '').trim();
    var k = String(values[i][1] || '').trim();
    var v = values[i][2];
    if (n || k) rows.push({ name: n, key: k, value: v, rowIndex: i + 1 });
  }
  return rows;
}

function findRow(name, key) {
  var rows = readAllRows();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].name === name && rows[i].key === key) return rows[i];
  }
  return null;
}

function upsert(name, key, value) {
  var sheet = getSheet();
  var row   = findRow(name, key);
  if (row) {
    sheet.getRange(row.rowIndex, 3).setValue(value);
  } else {
    sheet.appendRow([name, key, value]);
  }
}

function deleteByName(name) {
  var sheet = getSheet();
  var rows  = readAllRows().filter(function(r){ return r.name === name; });
  // Delete bottom-up so row indexes stay valid
  rows.sort(function(a,b){ return b.rowIndex - a.rowIndex; });
  rows.forEach(function(r){ sheet.deleteRow(r.rowIndex); });
}

// ── Setup: writes headers + default data if sheet is empty ───────
function setup() {
  var sheet  = getSheet();
  var values = sheet.getDataRange().getValues();

  // Write headers if missing
  if (values[0][0] !== 'name') {
    sheet.getRange(1,1,1,3).setValues([['name','key','value']]);
  }

  // Write default coach password if missing
  if (!findRow('settings','coachPassword')) {
    upsert('settings', 'coachPassword', 'coach123');
  }

  // Write default players if none exist
  var existing = readAllRows().filter(function(r){ return r.key === 'data' && r.name !== 'settings'; });
  if (existing.length === 0) {
    var names = ['Advay','Atom','Henry','Joey','Leo','Lewis','Luigi','Michael','Owen','Raul','Zac'];
    names.forEach(function(name){ upsert(name, 'data', JSON.stringify(defaultPlayer(name))); });
  }

  return { ok: true, message: 'Setup complete' };
}

// ── Player actions ────────────────────────────────────────────────
function getAllPlayers() {
  var rows    = readAllRows();
  var players = {};
  rows.filter(function(r){ return r.key === 'data' && r.name !== 'settings'; })
    .forEach(function(r){
      try { players[r.name] = JSON.parse(r.value); }
      catch(e) { /* skip corrupt row */ }
    });
  return { ok: true, players: players };
}

function savePlayer(player) {
  if (!player || !player.name) return { ok: false, error: 'No player data' };
  player = mergeDefaults(player);
  upsert(player.name, 'data', JSON.stringify(player));
  return { ok: true };
}

function addPlayer(player) {
  if (!player || !player.name) return { ok: false, error: 'No player data' };
  player = mergeDefaults(player);
  // addPlayer always writes — even if exists — so locally pending data gets through
  upsert(player.name, 'data', JSON.stringify(player));
  return { ok: true };
}

function removePlayer(name) {
  if (!name) return { ok: false, error: 'No name' };
  deleteByName(name);
  return { ok: true };
}

// ── Settings ─────────────────────────────────────────────────────
function getSettings() {
  var row  = findRow('settings', 'coachPassword');
  var pass = row ? String(row.value) : 'coach123';
  return { ok: true, coachPassword: pass };
}

function saveSettings(body) {
  if (body.coachPassword) upsert('settings', 'coachPassword', body.coachPassword);
  return { ok: true };
}

// ── Defaults ─────────────────────────────────────────────────────
function defaultPlayer(name) {
  return {
    name: name, age: '', height: '', weight: '',
    pin: '0000', firstLogin: true,
    scores: {
      cog:   { Running:0, Jumping:0, Stopping:0, Pivot:0, Footwork:0 },
      phys:  { Endurance:0, Strength:0, 'M. Endurance':0, 'M. Strength':0, Composure:0, Focus:0, 'Off. Awareness':0, 'Def. Awareness':0 },
      bball: { Shooting:0, Passing:0, Dribbling:0, 'Off. Reb.':0, 'Def. Reb.':0, Cutting:0, Flashing:0, Replacing:0, Screening:0, 'Roll/Pop':0 }
    },
    schedule: { odd:{}, even:{} },
    goals: [], comments: '', lastCoach: '', lastUpdated: ''
  };
}

function mergeDefaults(player) {
  var d = defaultPlayer(player.name);
  player.scores       = player.scores       || d.scores;
  player.scores.cog   = Object.assign({}, d.scores.cog,   player.scores.cog   || {});
  player.scores.phys  = Object.assign({}, d.scores.phys,  player.scores.phys  || {});
  player.scores.bball = Object.assign({}, d.scores.bball, player.scores.bball || {});
  player.schedule     = player.schedule     || d.schedule;
  player.goals        = player.goals        || d.goals;
  if (player.pin        === undefined) player.pin        = d.pin;
  if (player.firstLogin === undefined) player.firstLogin = d.firstLogin;
  return player;
}
