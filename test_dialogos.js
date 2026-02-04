import Database from 'better-sqlite3';
const db = new Database('./manolitri.db');

console.log('\n=== VERIFICACIÓN DE DIÁLOGOS ===\n');

const dialogos = db.prepare('SELECT npc_id, dialogo_id, substr(texto, 1, 60) as preview FROM npc_dialogues LIMIT 15').all();

console.log(`Total diálogos encontrados: ${dialogos.length}\n`);

dialogos.forEach((d, i) => {
    console.log(`${i + 1}. [${d.npc_id}] ${d.dialogo_id}:`);
    console.log(`   "${d.preview}..."\n`);
});

const npcs = db.prepare('SELECT id, nombre FROM npcs WHERE lugar_actual = "hospital"').all();
console.log('\n=== NPCs EN HOSPITAL ===');
npcs.forEach(n => console.log(`- ${n.id}: ${n.nombre}`));

db.close();
