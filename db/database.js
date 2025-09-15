const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/campanha.db');
const db2 = new sqlite3.Database('./db/TCC.db')

db.serialize(() => {
  // Tabela de Tipos de Roupa
  db.run(`CREATE TABLE IF NOT EXISTS roupas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    pontuacao INTEGER NOT NULL
  )`);

  // Tabela de Turmas
  db.run(`CREATE TABLE IF NOT EXISTS turmas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL,
    docente TEXT NOT NULL
  )`);

  // Tabela de Doações
  db.run(`CREATE TABLE IF NOT EXISTS doacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma_id INTEGER NOT NULL,
    roupa_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY(turma_id) REFERENCES turmas(id),
    FOREIGN KEY(roupa_id) REFERENCES roupas(id)
  )`);
});

module.exports = db;

db2.serialize(() => {
  // Tabela de Turmas
  db2.run(`CREATE TABLE IF NOT EXISTS TURMAS (
    id_turmas INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL,
    docente TEXT NOT NULL,
    d_total INTEGER NOT NULL,
    d_atual INTEGER NOT NULL,
    status INTEGER NOT NULL
  )`);

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

  // Tabela de Tipos de Itens
  db2.run(`CREATE TABLE IF NOT EXISTS ITENS (
    id_item INTEGER PRIMARY KEY AUTOINCREMENT,
    itens TEXT NOT NULL,
    ponto INTEGER NOT NULL,
    id_campanha INTEGER,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha)
  )`);

  // Tabela de Doações
  db2.run(`CREATE TABLE IF NOT EXISTS DOACOES (
    id_doacao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_campanha INTEGER NOT NULL,
    id_turmas INTEGER NOT NULL,
    id_item INTEGER NOT NULL,
    pontuacao INTEGER NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha),
    FOREIGN KEY(id_turmas) REFERENCES TURMAS(id_turmas),
    FOREIGN KEY(id_item) REFERENCES ITENS(id_item)
    )`)
});

module.exports = db2;