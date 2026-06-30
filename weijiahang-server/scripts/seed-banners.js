const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'weijiahang-dev.sqlite');
const db = new sqlite3.Database(dbPath);

const banners = [
  { position: 'home', title: '装修季特惠', desc: '瓷砖地板全场低至5折', bg: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', link: '', sortOrder: 1 },
  { position: 'home', title: '新店开业', desc: '首单9折 · 领航员免费带看', bg: 'linear-gradient(135deg, #1A3A4A, #2A5A6A)', link: '', sortOrder: 2 },
  { position: 'home', title: '三道把关保障', desc: '货不对板 · 平台先行赔付', bg: 'linear-gradient(135deg, #2D8B4A, #3DA85C)', link: '', sortOrder: 3 },
];

db.serialize(() => {
  const stmt = db.prepare(
    `INSERT INTO banners (id, position, title, "desc", bg, link, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))`
  );

  for (const b of banners) {
    const id = crypto.randomUUID();
    stmt.run(id, b.position, b.title, b.desc, b.bg, b.link, b.sortOrder, function (err) {
      if (err) console.error('❌', err.message);
      else console.log('✅', b.title, id);
    });
  }

  stmt.finalize();
});

setTimeout(() => {
  db.close();
  console.log('Done.');
}, 2000);
