const express = require("express");
const session = require("express-session");
const { db, db2 } = require("./db/database");
const app = express();
const port = 3000;

// Configurações
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Sessões para login
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 dia
    },
  })
);

// Middleware para passar informações do usuário para todas as views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Rotas públicas
app.get("/", (req, res) => res.render("index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/sobre", (req, res) => res.render("sobre"));
app.get("/doar", (req, res) => res.render("doar"));

// Processar login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    req.session.user = {
      role: "admin",
      name: "Administrador",
    };
    return res.redirect("/admin");
  }

  if (username === "aluno" && password === "aluno123") {
    req.session.user = {
      role: "aluno",
      name: "Aluno",
    };
    return res.redirect("/aluno");
  }

  if (username === "sAdmin" && password === "sAdmin123") {
    req.session.user = {
      role: "sAdmin",
      name: "sAdmin",
    };
    return res.redirect("/sAdmin");
  } else {
    res.redirect("/login?error=1");
  }
});

// Middleware de autenticação
const requireAuth = (role) => (req, res, next) => {
  if (req.session.user && req.session.user.role === role) {
    return next();
  }
  res.redirect("/login");
};

// Painel Admin (usa db - campanha.db)
app.get("/admin", requireAuth("admin"), (req, res) => {
  db.parallelize(() => {
    db.all(
      "SELECT id, turma || ' - ' || docente AS turma_info FROM turmas",
      (err, turmas) => {
        if (err) return console.error(err);

        db.all("SELECT * FROM roupas", (err, roupas) => {
          if (err) return console.error(err);

          res.render("admin", {
            turmas,
            roupas,
            success: req.query.success,
            error: req.query.error,
          });
        });
      }
    );
  });
});

// Painel Aluno (usa db - campanha.db)
app.get("/aluno", requireAuth("aluno"), (req, res) => {
  // Consulta para todas as turmas (não apenas as top 3)
  const allTurmasQuery =
    "SELECT id, turma || ' - ' || docente AS turma_docente FROM turmas";

  // Consulta para pontuação total por turma (top 3)
  const turmasQuery = `
    SELECT 
      t.id,
      t.turma || ' - ' || t.docente AS turma_docente,
      COALESCE(SUM(r.pontuacao * d.quantidade), 0) AS total_pontos
    FROM turmas t
    LEFT JOIN doacoes d ON t.id = d.turma_id
    LEFT JOIN roupas r ON d.roupa_id = r.id
    GROUP BY t.id
    ORDER BY total_pontos DESC
    LIMIT 3;
  `;

  // Consulta para itens doados por turma
  const itensQuery = `
    SELECT 
      t.id AS turma_id,
      r.tipo,
      r.pontuacao,
      COALESCE(SUM(d.quantidade), 0) AS quantidade_total,
      COALESCE(SUM(r.pontuacao * d.quantidade), 0) AS pontos_total
    FROM turmas t
    LEFT JOIN doacoes d ON t.id = d.turma_id
    LEFT JOIN roupas r ON d.roupa_id = r.id
    GROUP BY t.id, r.id
    ORDER BY t.id, r.tipo;
  `;

  db.serialize(() => {
    // Buscar todas as turmas
    db.all(allTurmasQuery, (err, allTurmas) => {
      if (err) return console.error(err);

      // Buscar top 3 turmas
      db.all(turmasQuery, (err, turmas) => {
        if (err) return console.error(err);

        // Buscar itens por turma
        db.all(itensQuery, (err, itens) => {
          if (err) return console.error(err);

          // Organizar itens por turma
          const itensPorTurma = {};
          itens.forEach((item) => {
            if (!itensPorTurma[item.turma_id]) {
              itensPorTurma[item.turma_id] = [];
            }
            itensPorTurma[item.turma_id].push(item);
          });

          res.render("aluno", {
            turmas,
            itensPorTurma,
            allTurmas, // Enviar todas as turmas para o front-end
            user: req.session.user,
          });
        });
      });
    });
  });
});

// Registrar nova doação
app.post("/doacao", requireAuth("admin"), (req, res) => {
  const { turma_id, roupa_id, quantidade, data } = req.body;
  console.log("Tentando registrar doação:", {
    turma_id,
    roupa_id,
    quantidade,
    data,
  });

  // Verificar se todos os campos estão preenchidos
  if (!turma_id || !roupa_id || !quantidade || !data) {
    console.error("Campos obrigatórios faltando");
    return res.redirect("/admin?error=Campos obrigatórios faltando");
  }

  db.run(
    `INSERT INTO doacoes (turma_id, roupa_id, quantidade, data)
     VALUES (?, ?, ?, ?)`,
    [turma_id, roupa_id, quantidade, data],
    function (err) {
      if (err) {
        console.error("Erro ao registrar doação:", err);
        return res.redirect("/admin?error=Erro ao registrar doação");
      }

      console.log(`Doação registrada com ID: ${this.lastID}`);
      res.redirect("/admin?success=Doação registrada com sucesso");
    }
  );
});

// Rota para a página do Super Admin
app.get("/sAdmin", requireAuth("sAdmin"), (req, res) => {
  res.render("sAdmin");
});

// Rota principal - Listar turmas (usa db2 - TCC.db)
app.get('/admin_edit_turmas', requireAuth('sAdmin'), (req, res) => {
  db2.all('SELECT * FROM TURMAS', (err, turmas) => {
    if (err) {
      console.error(err);
      return res.render('admin_edit_turmas', { 
        turmas: [], 
        error: 'Erro ao carregar turmas',
        user: req.session.user 
      });
    }

    res.render('admin_edit_turmas', { 
      turmas: turmas, 
      user: req.session.user,
      success: req.query.success,
      error: req.query.error
    });
  });
});

// Criar nova turma (usa db2 - TCC.db)
app.post('/admin_edit_turmas/create', requireAuth('sAdmin'), (req, res) => {
  const { TURMA, DOCENTE, D_TOTAL, D_ATUAL, STATUS, DT_INICIAL, DT_FINAL } = req.body;
  
  db2.run(
    `INSERT INTO TURMAS (TURMA, DOCENTE, D_TOTAL, D_ATUAL, STATUS, DT_INICIAL, DT_FINAL) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [TURMA, DOCENTE, D_TOTAL || 0, D_ATUAL || 0, STATUS, DT_INICIAL, DT_FINAL],
    function(err) {
      if (err) {
        console.error(err);
        return res.redirect('/admin_edit_turmas?error=Erro ao criar turma');
      }
      
      res.redirect('/admin_edit_turmas?success=Turma criada com sucesso');
    }
  );
});

// Atualizar turma (usa db2 - TCC.db)
app.post('/admin_edit_turmas/update', requireAuth('sAdmin'), (req, res) => {
  const { ID_TURMAS, TURMA, DOCENTE, D_TOTAL, D_ATUAL, STATUS, DT_INICIAL, DT_FINAL } = req.body;
  
  db2.run(
    `UPDATE TURMAS SET TURMA = ?, DOCENTE = ?, D_TOTAL = ?, D_ATUAL = ?, STATUS = ?, DT_INICIAL = ?, DT_FINAL = ? 
     WHERE ID_TURMAS = ?`,
    [TURMA, DOCENTE, D_TOTAL, D_ATUAL, STATUS, DT_INICIAL, DT_FINAL, ID_TURMAS],
    function(err) {
      if (err) {
        console.error(err);
        return res.redirect('/admin_edit_turmas?error=Erro ao atualizar turma');
      }
      
      res.redirect('/admin_edit_turmas?success=Turma atualizada com sucesso');
    }
  );
});

// Desativar turma (usa db2 - TCC.db)
app.get('/admin_edit_turmas/deactivate/:id', requireAuth('sAdmin'), (req, res) => {
  const id = req.params.id;
  
  db2.run(
    'UPDATE TURMAS SET STATUS = 0 WHERE ID_TURMAS = ?',
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.redirect('/admin_edit_turmas?error=Erro ao desativar turma');
      }
      
      res.redirect('/admin_edit_turmas?success=Turma desativada com sucesso');
    }
  );
});

// Ativar turma (usa db2 - TCC.db)
app.get('/admin_edit_turmas/activate/:id', requireAuth('sAdmin'), (req, res) => {
  const id = req.params.id;
  
  db2.run(
    'UPDATE TURMAS SET STATUS = 1 WHERE ID_TURMAS = ?',
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.redirect('/admin_edit_turmas?error=Erro ao ativar turma');
      }
      
      res.redirect('/admin_edit_turmas?success=Turma ativada com sucesso');
    }
  );
});

// Rota para gerenciar campanhas (usa db2 - TCC.db) - CORRIGIDA
app.get("/admin_edit_campanha", requireAuth("sAdmin"), (req, res) => {
  // Buscar campanhas do db2
  db2.all("SELECT * FROM CAMPANHAS", (err, campanhas) => {
    if (err) {
      console.error("Erro ao buscar campanhas:", err);
      return res.render("admin_edit_campanha", {
        campanhas: [],
        turmas: [],
        itens: [],
        roupas: [],
        error: "Erro ao carregar campanhas",
        user: req.session.user
      });
    }

    // Buscar turmas do db2 para associar à campanha
    db2.all("SELECT * FROM TURMAS WHERE STATUS = 1", (err, turmas, roupas) => {
      if (err) {
        console.error("Erro ao buscar turmas:", err);
        return res.render("admin_edit_campanha", {
          campanhas: [],
          turmas: [],
          itens: [],
          roupas: [],
          error: "Erro ao carregar turmas",
          user: req.session.user
        });
      }

      // Buscar itens do db2
      db2.all("SELECT * FROM ITENS", (err, itens) => {
        if (err) {
          console.error("Erro ao buscar itens:", err);
          return res.render("admin_edit_campanha", {
            campanhas: [],
            turmas: [],
            itens: [],
            roupas: [],
            error: "Erro ao carregar itens",
            user: req.session.user
          });
        }

        res.render("admin_edit_campanha", {
          campanhas: campanhas,
          turmas: turmas,
          itens: itens,
          roupas: roupas,
          success: req.query.success,
          error: req.query.error,
          user: req.session.user
        });
      });
    });
  });
});

// Rota para processar a criação de campanhas (usa db2 - TCC.db)
app.post('/admin_edit_campanha/create', requireAuth('sAdmin'), (req, res) => {
  const { nome_campanha, dt_inicial, dt_final, turmas_selecionadas, itens } = req.body;
  
  db2.run(
    `INSERT INTO CAMPANHAS (nome_campanha, dt_inicial, dt_final) 
     VALUES (?, ?, ?)`,
    [nome_campanha, dt_inicial, dt_final],
    function(err) {
      if (err) {
        console.error(err);
        return res.redirect('/admin_edit_campanha?error=Erro ao criar campanha');
      }
      
      const campanhaId = this.lastID;
      
      // Associar turmas selecionadas à campanha
      if (turmas_selecionadas && turmas_selecionadas.length) {
        if (typeof turmas_selecionadas === 'string') {
          // Se apenas uma turma foi selecionada
          db2.run(
            `INSERT INTO CAMPANHA_TURMAS (id_campanha, id_turmas) VALUES (?, ?)`,
            [campanhaId, turmas_selecionadas]
          );
        } else {
          // Se várias turmas foram selecionadas
          turmas_selecionadas.forEach(turmaId => {
            db2.run(
              `INSERT INTO CAMPANHA_TURMAS (id_campanha, id_turmas) VALUES (?, ?)`,
              [campanhaId, turmaId]
            );
          });
        }
      }
      
      res.redirect('/admin_edit_campanha?success=Campanha criada com sucesso');
    }
  );
});

// Visualização de doações (usa db - campanha.db)
app.get("/admin/doacoes", requireAuth("admin"), (req, res) => {
  const query = `
    SELECT d.id, 
           t.turma || ' - ' || t.docente AS turma_docente,
           r.tipo, 
           r.pontuacao, 
           d.quantidade, 
           d.data,
           (r.pontuacao * d.quantidade) as pontos
    FROM doacoes d
    JOIN turmas t ON d.turma_id = t.id
    JOIN roupas r ON d.roupa_id = r.id
    ORDER BY d.data DESC
  `;

  db.all(query, (err, doacoes) => {
    if (err) {
      console.error(err);
      return res.render("admin_doacoes", {
        error: "Erro ao carregar doações",
        user: req.session.user,
      });
    }

    res.render("admin_doacoes", {
      doacoes,
      success: req.query.success,
      user: req.session.user,
    });
  });
});

// Relatório de turmas (top 3) (usa db - campanha.db)
app.get("/admin/turmas", requireAuth("admin"), (req, res) => {
  // Consulta para todas as turmas
  const allTurmasQuery =
    "SELECT id, turma || ' - ' || docente AS turma_docente FROM turmas";

  // Consulta para pontuação total por turma (top 3)
  const turmasQuery = `
    SELECT 
      t.id,
      t.turma || ' - ' || t.docente AS turma_docente,
      COALESCE(SUM(r.pontuacao * d.quantidade), 0) AS total_pontos
    FROM turmas t
    LEFT JOIN doacoes d ON t.id = d.turma_id
    LEFT JOIN roupas r ON d.roupa_id = r.id
    GROUP BY t.id
    ORDER BY total_pontos DESC
    LIMIT 3;
  `;

  // Consulta para itens doados por turma
  const itensQuery = `
    SELECT 
      t.id AS turma_id,
      r.tipo,
      r.pontuacao,
      COALESCE(SUM(d.quantidade), 0) AS quantidade_total,
      COALESCE(SUM(r.pontuacao * d.quantidade), 0) AS pontos_total
    FROM turmas t
    LEFT JOIN doacoes d ON t.id = d.turma_id
    LEFT JOIN roupas r ON d.roupa_id = r.id
    GROUP BY t.id, r.id
    ORDER BY t.id, r.tipo;
  `;

  db.serialize(() => {
    // Buscar todas as turmas
    db.all(allTurmasQuery, (err, allTurmas) => {
      if (err) return console.error(err);

      // Buscar top 3 turmas
      db.all(turmasQuery, (err, turmas) => {
        if (err) return console.error(err);

        // Buscar itens por turma
        db.all(itensQuery, (err, itens) => {
          if (err) return console.error(err);

          // Organizar itens por turma
          const itensPorTurma = {};
          itens.forEach((item) => {
            if (!itensPorTurma[item.turma_id]) {
              itensPorTurma[item.turma_id] = [];
            }
            itensPorTurma[item.turma_id].push(item);
          });

          res.render("admin_turmas", {
            turmas,
            itensPorTurma,
            allTurmas, // Enviar todas as turmas para o front-end
            user: req.session.user,
          });
        });
      });
    });
  });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao destruir sessão:", err);
    }
    res.redirect("/");
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando: http://localhost:${port}`);
  console.log(
    `Login admin: http://localhost:${port}/admin (usuário: admin, senha: admin123)`
  );
  console.log(
    `Login aluno: http://localhost:${port}/aluno (usuário: aluno, senha: aluno123)`
  );
});