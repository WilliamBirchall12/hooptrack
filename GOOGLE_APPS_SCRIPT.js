// ═══════════════════════════════════════════════════════
// HoopTrack — Google Apps Script Backend
// Paste this entire file into script.google.com
// Then click Deploy > New Deployment > Web App
// ═══════════════════════════════════════════════════════

const SHEET_NAME = 'HoopTrack';
const COACH_PASS_KEY = 'coachPassword';
const DEFAULT_COACH_PASS = 'coach123';

// ─── MAIN ENTRY POINTS ───────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter || {};
  const body = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
  const action = params.action || body.action;

  const result = route(action, params, body);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(action, params, body) {
  try {
    switch(action) {
      case 'getRoster':       return getRoster();
      case 'getPlayer':       return getPlayer(params.name || body.name);
      case 'savePlayer':      return savePlayer(body.player);
      case 'addPlayer':       return addPlayer(body.player);
      case 'removePlayer':    return removePlayer(body.name);
      case 'getSettings':     return getSettings();
      case 'saveSettings':    return saveSettings(body);
      case 'ping':            return { ok: true };
      default:                return { error: 'Unknown action: ' + action };
    }
  } catch(err) {
    return { error: err.toString() };
  }
}

// ─── SPREADSHEET HELPERS ─────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add headers
    sheet.getRange(1, 1, 1, 3).setValues([['name', 'key', 'value']]);
    sheet.setFrozenRows(1);
    // Seed default settings
    setRow(sheet, 'settings', COACH_PASS_KEY, DEFAULT_COACH_PASS);
    // Seed default players
    const defaultPlayers = ['Advay','Atom','Henry','Joey','Leo','Lewis','Luigi','Michael','Owen','Raul','Zac'];
    defaultPlayers.forEach(name => {
      const player = makeDefaultPlayer(name);
      setRow(sheet, name, 'data', JSON.stringify(player));
    });
  }
  return sheet;
}

function getAllRows(sheet) {
  const data = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    rows.push({ name: data[i][0], key: data[i][1], value: data[i][2] });
  }
  return rows;
}

function findRow(sheet, name, key) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && data[i][1] === key) return i + 1; // 1-indexed
  }
  return -1;
}

function setRow(sheet, name, key, value) {
  const rowNum = findRow(sheet, name, key);
  if (rowNum > 0) {
    sheet.getRange(rowNum, 3).setValue(value);
  } else {
    sheet.appendRow([name, key, value]);
  }
}

function deleteRows(sheet, name) {
  const data = sheet.getDataRange().getValues();
  // Delete from bottom up to avoid index shifting
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === name) sheet.deleteRow(i + 1);
  }
}

// ─── ACTIONS ─────────────────────────────────────────────
function getRoster() {
  const sheet = getSheet();
  const rows = getAllRows(sheet);
  const names = [...new Set(
    rows
      .filter(r => r.key === 'data' && r.name !== 'settings')
      .map(r => r.name)
  )];
  return { ok: true, roster: names };
}

function getPlayer(name) {
  if (!name) return { error: 'No name provided' };
  const sheet = getSheet();
  const rowNum = findRow(sheet, name, 'data');
  if (rowNum < 0) return { error: 'Player not found: ' + name };
  const value = sheet.getRange(rowNum, 3).getValue();
  return { ok: true, player: JSON.parse(value) };
}

function savePlayer(player) {
  if (!player || !player.name) return { error: 'Invalid player data' };
  const sheet = getSheet();
  setRow(sheet, player.name, 'data', JSON.stringify(player));
  return { ok: true };
}

function addPlayer(player) {
  if (!player || !player.name) return { error: 'Invalid player data' };
  const sheet = getSheet();
  const existing = findRow(sheet, player.name, 'data');
  if (existing > 0) return { error: 'Player already exists' };
  setRow(sheet, player.name, 'data', JSON.stringify(player));
  return { ok: true };
}

function removePlayer(name) {
  if (!name) return { error: 'No name provided' };
  const sheet = getSheet();
  deleteRows(sheet, name);
  return { ok: true };
}

function getSettings() {
  const sheet = getSheet();
  const rowNum = findRow(sheet, 'settings', COACH_PASS_KEY);
  const pass = rowNum > 0 ? sheet.getRange(rowNum, 3).getValue() : DEFAULT_COACH_PASS;
  return { ok: true, coachPassword: pass };
}

function saveSettings(body) {
  const sheet = getSheet();
  if (body.coachPassword) setRow(sheet, 'settings', COACH_PASS_KEY, body.coachPassword);
  return { ok: true };
}

// ─── DEFAULT PLAYER FACTORY ───────────────────────────────
function makeDefaultPlayer(name) {
  return {
    name: name,
    age: '', height: '', weight: '',
    pin: '0000',
    firstLogin: true,
    scores: {
      cog:   { Running:0, Jumping:0, Stopping:0, Pivot:0, Footwork:0 },
      phys:  { Endurance:0, Strength:0, 'M. Endurance':0, 'M. Strength':0, Composure:0, Focus:0, 'Off. Awareness':0, 'Def. Awareness':0 },
      bball: { Shooting:0, Passing:0, Dribbling:0, 'Off. Reb.':0, 'Def. Reb.':0, Cutting:0, Flashing:0, Replacing:0, Screening:0, 'Roll/Pop':0 }
    },
    schedule: { odd: {}, even: {} },
    goals: [],
    comments: '',
    lastCoach: '',
    lastUpdated: ''
  };
}
