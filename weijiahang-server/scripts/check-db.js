var sqlite3 = require('sqlite3');
var path = require('path');
var dbPath = path.join(__dirname, '..', 'weijiahang-dev.sqlite');
console.log('DB path:', dbPath);

var db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, function(err) {
  if (err) { console.error('Open error:', err.message); return; }
  console.log('Connected to DB');
});

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", function(err, rows) {
  if (err) { console.error(err.message); db.close(); return; }
  console.log('Tables (' + rows.length + '): ' + rows.map(function(r) { return r.name; }).join(', '));

  var pending = rows.length;
  if (pending === 0) { db.close(); return; }

  rows.forEach(function(r) {
    db.get('SELECT COUNT(*) as cnt FROM "' + r.name + '"', function(e2, row) {
      if (!e2) console.log('  ' + r.name + ': ' + row.cnt + ' rows');
      pending--;
      if (pending === 0) { db.close(); console.log('Done.'); }
    });
  });
});
