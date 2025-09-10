const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/campanha.db');
const db2 = new sqlite3.Database('./db/TCC.db')

db2.serialize(() => {
  // Tabela de Campanhas
  db2.run(`CREATE TABLE IF NOT EXISTS CAMPANHAS (
    id_campanha INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_campanha TEXT NOT NULL,
    id_turmas INTEGER,
    status_sala INTEGER NOT NULL,
    dt_inicial TEXT NOT NULL,
    dt_final TEXT NOT NULL,
    pt_total_sala INTEGER NOT NULL,
    FOREIGN KEY(id_turmas) REFERENCES TURMAS(id_turmas)
  )`);

  // Tabela de Turmas
  db2.run(`CREATE TABLE IF NOT EXISTS TURMAS (
    id_turmas INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL,
    docente TEXT NOT NULL,
    d_total INTEGER NOT NULL,
    d_atual INTEGER NOT NULL,
    status INTEGER NOT NULL,
    FOREIGN KEY(id_turmas) REFERENCES CAMPANHAS(id_turmas)
  )`);
 
  // Tabela de Tipos de Itens
  db2.run(`CREATE TABLE IF NOT EXISTS ITENS (
    id_item INTEGER PRIMARY KEY AUTOINCREMENT,
    itens TEXT NOT NULL,
    ponto INTEGER NOT NULL,
    id_campanha INTEGER,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha)
  )`);
});

module.exports = db2;