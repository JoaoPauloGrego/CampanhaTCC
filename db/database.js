const sqlite3 = require('sqlite3').verbose();

// Conexão com os bancos
const db = new sqlite3.Database('./db/campanha.db');
const db2 = new sqlite3.Database('./db/TCC.db');

// Configuração do db2 (TCC.db)
db2.serialize(() => {
  // Tabela de Campanhas - CORRIGIDA a foreign key
  db2.run(`CREATE TABLE IF NOT EXISTS CAMPANHAS (
    id_campanha INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_campanha TEXT NOT NULL,
    status_sala INTEGER NOT NULL DEFAULT 1,
    dt_inicial TEXT NOT NULL,
    dt_final TEXT NOT NULL,
    pt_total_sala INTEGER NOT NULL DEFAULT 0
  )`);

  // Tabela de Turmas - CORRIGIDA a foreign key
  db2.run(`CREATE TABLE IF NOT EXISTS TURMAS (
    id_turmas INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL,
    docente TEXT NOT NULL,
    d_total INTEGER NOT NULL DEFAULT 0,
    d_atual INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    dt_inicial TEXT,
    dt_final TEXT
  )`);

  // Tabela de relação entre Campanhas e Turmas (Muitos para Muitos)
  db2.run(`CREATE TABLE IF NOT EXISTS CAMPANHA_TURMAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_campanha INTEGER NOT NULL,
    id_turmas INTEGER NOT NULL,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha),
    FOREIGN KEY(id_turmas) REFERENCES TURMAS(id_turmas)
  )`);

  // Tabela de Tipos de Itens - CORRIGIDA a foreign key
  db2.run(`CREATE TABLE IF NOT EXISTS ITENS (
    id_item INTEGER PRIMARY KEY AUTOINCREMENT,
    itens TEXT NOT NULL,
    ponto INTEGER NOT NULL,
    id_campanha INTEGER,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha)
  )`);
});

// Configuração do db (campanha.db) - para compatibilidade com o sistema existente
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS roupas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    pontuacao INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS turmas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL,
    docente TEXT NOT NULL
  )`);

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

// Exportando ambos os bancos
module.exports = { db, db2 };