// db/database.js
const sqlite3 = require('sqlite3').verbose();

// Conexão com o banco de dados TCC.db (usando db2 como nome principal)
const db = new sqlite3.Database('./db/TCC.db');

// Configuração das tabelas
db.serialize(() => {

  // Tabela de Usuários
  db.run(`CREATE TABLE IF NOT EXISTS USUARIOS (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_usuario TEXT NOT NULL,
    role TEXT NOT NULL,
    senha TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1
  )`)

  // Tabela de Campanhas
  db.run(`CREATE TABLE IF NOT EXISTS CAMPANHAS (
    id_campanha INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_campanha TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    dt_inicial TEXT NOT NULL,
    dt_final TEXT NOT NULL,
    meta_pontos INTEGER DEFAULT 0
  )`);

  // Tabela de Turmas
  db.run(`CREATE TABLE IF NOT EXISTS TURMAS (
    id_turma INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_turma TEXT NOT NULL,
    docente TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    dt_inicial TEXT,
    dt_final TEXT
  )`);

  // Tabela de Itens
  db.run(`CREATE TABLE IF NOT EXISTS ITENS (
    id_item INTEGER PRIMARY KEY AUTOINCREMENT,
    id_campanha TEXT NOT NULL,
    nome_item TEXT NOT NULL,
    pontos INTEGER NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha)
  )`);

  // Tabela de itens independente
  db.run(`CREATE TABLE IF NOT EXISTS ITENS_EVANESCENCE(
  id_item INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_item TEXT NOT NULL,
  pontos INTEGER NOT NULL
  )`);

  // Tabela de Relacionamento entre Campanhas e Turmas
  db.run(`CREATE TABLE IF NOT EXISTS CAMPANHA_TURMAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_campanha INTEGER NOT NULL,
    id_turma INTEGER NOT NULL,
    pontos_arrecadados INTEGER DEFAULT 0,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha) ON DELETE CASCADE,
    FOREIGN KEY(id_turma) REFERENCES TURMAS(id_turma) ON DELETE CASCADE
  )`);

  // Tabela de Doações
  db.run(`CREATE TABLE IF NOT EXISTS DOACOES (
    id_doacao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_campanha INTEGER NOT NULL,
    id_turma INTEGER NOT NULL,
    id_item INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    data_doacao TEXT NOT NULL,
    pontos_total INTEGER NOT NULL,
    FOREIGN KEY(id_campanha) REFERENCES CAMPANHAS(id_campanha),
    FOREIGN KEY(id_turma) REFERENCES TURMAS(id_turma),
    FOREIGN KEY(id_item) REFERENCES ITENS(id_item)
  )`);

  // Inserir dados iniciais de itens
  const itensIniciais = [
    { nome: 'Agasalho', pontos: 5 },
    { nome: 'Calça', pontos: 3 },
    { nome: 'Blusa', pontos: 2 },
    { nome: 'Meias', pontos: 1 },
    { nome: 'Tênis', pontos: 4 },
    { nome: 'Casaco', pontos: 6 },
    { nome: 'Cobertor', pontos: 7 },
    { nome: 'Gorro', pontos: 2 },
    { nome: 'Luvas', pontos: 2 },
    { nome: 'Cachecol', pontos: 3 }
  ];

  itensIniciais.forEach(item => {
    db.run(
      `INSERT OR IGNORE INTO ITENS (nome_item, pontos) VALUES (?, ?)`,
      [item.nome, item.pontos]
    );
  });
});

module.exports = db;