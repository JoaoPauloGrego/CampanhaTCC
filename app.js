const express = require("express");
const session = require("express-session");
const db = require("./db/database");
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
app.get("/", (req, res) => {
  console.log("POST /"), res.render("index");
});
app.get("/login", (req, res) => {
  console.log("POST /login"), res.render("login");
});
app.get("/sobre", (req, res) => {
  console.log("POST /sobre"), res.render("sobre");
});
app.get("/doar", (req, res) => {
  console.log("POST /doar"), res.render("doar");
});

// Processar login
app.post("/login", (req, res) => {
  console.log("POST /login");
  const { nome_usuario, senha } = req.body;
  const query = "SELECT * FROM USUARIOS WHERE nome_usuario = ? AND senha = ?";

  db.get(query, [nome_usuario, senha], (err, row) => {
    if (err) {
      console.error(err);
    }
    if (row) {
      console.log(JSON.stringify(row));

      req.session.user = {
        nome_usuario: nome_usuario,
        id_usuario: row.id,
        role: row.role,
      };
      req.session.loggedin = true;
      req.session.role = row.role;

      if (row.role === "admin") {
        return res.redirect("/admin");
      } else if (row.role === "sAdmin") {
        return res.redirect("/sAdmin");
      } else if (row.role === "aluno") {
        return res.redirect("/aluno");
      } else {
        return res.redirect("/login");
      }
    } else {
      res.redirect("/login?error=Login ou senha incorreto")
    }
  });
});

// Middleware de autenticação
const requireAuth = (role) => (req, res, next) => {
  if (
    req.session.loggedin &&
    req.session.user &&
    req.session.user.role === role
  ) {
    return next();
  }
  res.redirect("/login");
};

// Painel Admin Base
app.get("/admin", (req, res) => {
  console.log("GET /admin");
  if (
    req.session.loggedin &&
    req.session.user &&
    req.session.user.role === "admin"
  ) {
    const queryTurma = `SELECT id_turma, nome_turma, docente FROM TURMAS WHERE status = 1`;
    const queryItens = `SELECT * FROM ITENS WHERE status = 1`;
    const queryCampanhas = `SELECT * FROM CAMPANHAS WHERE status = 1`;

    db.serialize(() => {
      // Buscar turmas
      db.all(queryTurma, (err, turmas) => {
        if (err) {
          console.error(err);
          return res.redirect("/admin?error=Erro ao carregar turmas");
        }

        // Buscar itens
        db.all(queryItens, (err, itens) => {
          if (err) {
            console.error(err);
            return res.redirect("/admin?error=Erro ao carregar itens");
          }

          // Buscar campanhas
          db.all(queryCampanhas, (err, campanhas) => {
            if (err) {
              console.error(err);
              return res.redirect("/admin?error=Erro ao carregar campanhas");
            }

            res.render("admin", {
              TURMAS: turmas,
              CAMPANHAS: campanhas,
              ITENS: itens,
              success: req.query.success,
              error: req.query.error,
              user: req.session.user,
            });
          });
        });
      });
    });
  } else {
    res.redirect("/login?error=Acesso negado");
  }
});

app.get("aluno/selectCampanha", (req, res) => {
  console.log("GET /aluno/selectCampanha");
  if (!req.session.loggedin || req.session.user.role !== "aluno") {
    console.log("Acesso negado - usuário não autenticado");
    return res.redirect("/login?error=Acesso negado");
  }
  // Consulta para todas as campanhas ativas MOURIS 
  const allCampanhasQuery =
    "SELECT id_campanha || ' - ' || nome_campanha AS campanhas FROM CAMPANHAS WHERE STATUS = 1"
})

app.get("/aluno", (req, res) => {
  console.log("GET /aluno");
  if (!req.session.loggedin || req.session.user.role !== "aluno") {
    console.log("Acesso negado - usuário não autenticado");
    return res.redirect("/login?error=Acesso negado");
    }
  // Consulta para todas as turmas (não apenas as top 3)
  const allTurmasQuery =
    "SELECT id_turma, nome_turma || ' - ' || docente AS turma_docente FROM turmas";

  // Consulta para pontuação total por turma (top 3)
  const turmasQuery = `
    SELECT 
      t.id_turma,
      t.nome_turma || ' - ' || t.docente AS turma_docente,
      COALESCE(SUM(i.pontos * d.quantidade), 0) AS total_pontos
    FROM TURMAS t
    LEFT JOIN DOACOES d ON t.id_turma = d.id_turma
    LEFT JOIN ITENS i ON d.id_item = i.id_item
    GROUP BY t.id_turma
    ORDER BY total_pontos DESC
    LIMIT 3;
  `;
  console.log("Resultado da requisição:", turmasQuery)

  // Consulta para itens doados por turma
  const itensQuery = `
    SELECT 
      t.id_turma,
      i.nome_item,
      i.pontos,
      COALESCE(SUM(d.quantidade), 0) AS quantidade_total,
      COALESCE(SUM(i.pontos * d.quantidade), 0) AS pontos_total
    FROM TURMAS t
    LEFT JOIN DOACOES d ON t.id_turma = d.id_turma
    LEFT JOIN ITENS i ON d.id_item = i.id_item
    GROUP BY t.id_turma, i.id_item
    ORDER BY t.id_turma, i.nome_item;
  `;
  console.log("Resultado da requisição:", itensQuery)

  db.serialize(() => {
    // Busca todas as turmas
    db.all(allTurmasQuery, (err, allTurmas) => {
      if (err) return console.error(err);

      // Busca top 3 turmas
      db.all(turmasQuery, (err, turmas) => {
        if (err) return console.error(err);

        // Busca itens por turma
        db.all(itensQuery, (err, itens) => {
          if (err) return console.error(err);

          // Organiza itens por turma
          const itensPorTurma = {};
          itens.forEach((item) => {
            if (!itensPorTurma[item.id_turma]) {
              itensPorTurma[item.id_turma] = [];
            }
            itensPorTurma[item.id_turma].push(item);
          });

          res.render("aluno_campanha_tabela", {
            turmas,
            itensPorTurma,
            allTurmas, // Envia todas as turmas para o front-end
            user: req.session.user,
          });
        });
      });
    });
  });
});

app.get("/admin/turmas", (req, res) => {
  console.log("GET /admin/turmas");
  if (!req.session.loggedin || req.session.user.role !== "admin") {
    console.log("Acesso negado - usuário não autenticado");
    return res.redirect("/login?error=Acesso negado");
    }
  // Consulta para todas as turmas (não apenas as top 3)
  const allTurmasQuery =
    "SELECT id_turma, nome_turma || ' - ' || docente AS turma_docente FROM turmas";

  // Consulta para pontuação total por turma (top 3)
  const turmasQuery = `
    SELECT 
      t.id_turma,
      t.nome_turma || ' - ' || t.docente AS turma_docente,
      COALESCE(SUM(i.pontos * d.quantidade), 0) AS total_pontos
    FROM TURMAS t
    LEFT JOIN DOACOES d ON t.id_turma = d.id_turma
    LEFT JOIN ITENS i ON d.id_item = i.id_item
    GROUP BY t.id_turma
    ORDER BY total_pontos DESC
    LIMIT 3;
  `;
  console.log("Resultado da requisição:", turmasQuery)

  // Consulta para itens doados por turma
  const itensQuery = `
    SELECT 
      t.id_turma,
      i.nome_item,
      i.pontos,
      COALESCE(SUM(d.quantidade), 0) AS quantidade_total,
      COALESCE(SUM(i.pontos * d.quantidade), 0) AS pontos_total
    FROM TURMAS t
    LEFT JOIN DOACOES d ON t.id_turma = d.id_turma
    LEFT JOIN ITENS i ON d.id_item = i.id_item
    GROUP BY t.id_turma, i.id_item
    ORDER BY t.id_turma, i.nome_item;
  `;
  console.log("Resultado da requisição:", itensQuery)

  db.serialize(() => {
    // Busca todas as turmas
    db.all(allTurmasQuery, (err, allTurmas) => {
      if (err) return console.error(err);

      // Busca top 3 turmas
      db.all(turmasQuery, (err, turmas) => {
        if (err) return console.error(err);

        // Busca itens por turma
        db.all(itensQuery, (err, itens) => {
          if (err) return console.error(err);

          // Organiza itens por turma
          const itensPorTurma = {};
          itens.forEach((item) => {
            if (!itensPorTurma[item.id_turma]) {
              itensPorTurma[item.id_turma] = [];
            }
            itensPorTurma[item.id_turma].push(item);
          });

          res.render("admin_campanha_tabela", {
            turmas,
            itensPorTurma,
            allTurmas, // Envia todas as turmas para o front-end
            user: req.session.user,
          });
        });
      });
    });
  });
});

// Registra nova doação
app.post("/doacao", (req, res) => {
  console.log("POST /doacao recebido");
  console.log("Dados recebidos:", req.body);

  // Verificar autenticação primeiro
  if (!req.session.loggedin || req.session.user.role !== "admin") {
    console.log("Acesso negado - usuário não autenticado");
    return res.redirect("/login?error=Acesso negado");
  }

  const { id_campanha, id_turma, id_item, quantidade, data_doacao } = req.body;

  // Verificar se todos os campos estão preenchidos
  if (!id_campanha || !id_turma || !id_item || !quantidade || !data_doacao) {
    console.error("Campos obrigatórios faltando:", {
      id_campanha, id_turma, id_item, quantidade, data_doacao
    });
    return res.redirect("/admin?error=Campos obrigatórios faltando");
  }

  // Primeiro, buscar a pontuação do item selecionado
  db.get(
    "SELECT pontos FROM ITENS WHERE id_item = ?",
    [id_item],
    (err, item) => {
      if (err) {
        console.error("Erro ao buscar pontuação do item:", err);
        return res.redirect("/admin?error=Erro ao buscar item");
      }
      
      if (!item) {
        console.error("Item não encontrado para ID:", id_item);
        return res.redirect("/admin?error=Item não encontrado");
      }

      console.log("Item encontrado:", item);
      console.log("Pontuação do item:", item.pontos);
      console.log("Quantidade:", quantidade);

      // Calcular pontos totais
      const pontosTotais = parseInt(quantidade) * parseInt(item.pontos);
      console.log("Pontos totais calculados:", pontosTotais);

      // Inserir a doação com os pontos totais
      db.run(
        `INSERT INTO DOACOES (id_campanha, id_turma, id_item, quantidade, data_doacao, pontos_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_campanha, id_turma, id_item, quantidade, data_doacao, pontosTotais],
        function (err) {
          if (err) {
            console.error("Erro ao registrar doação:", err);
            return res.redirect("/admin?error=Erro ao registrar doação: " + err.message);
          }

          console.log(`Doação registrada com ID: ${this.lastID}`);
          res.redirect("/admin?success=Doação registrada com sucesso");
        }
      );
    }
  );
});

// Rota para a página do Super Admin
app.get("/sAdmin", (req, res) => {
  if (
    req.session.loggedin &&
    req.session.user &&
    req.session.user.role === "sAdmin"
  ) {
  res.render("sAdmin");
  } else{
    res.redirect("/login?error=Acesso negado")
  }
});

// Rota principal - Listar turmas (usa db2 - TCC.db)
app.get("/admin_edit_turmas", (req, res) => {
  db.all("SELECT * FROM TURMAS", (err, turmas) => {
    if (err) {
      console.error(err);
      return res.render("admin_edit_turmas", {
        turmas: [],
        error: "Erro ao carregar turmas",
        user: req.session.user,
      });
    }

    res.render("admin_edit_turmas", {
      turmas: turmas,
      user: req.session.user,
      success: req.query.success,
      error: req.query.error,
    });
  });
});

// Criar nova turma
app.post("/admin_edit_turmas/create", requireAuth("sAdmin"), (req, res) => {
  const { nome_turma, docente, status, dt_inicial, dt_final } = req.body;

  db.run(
    `INSERT INTO TURMAS (nome_turma, docente, status, dt_inicial, dt_final) 
     VALUES (?, ?, ?, ?, ?)`,
    [nome_turma, docente, status || 1, dt_inicial, dt_final],
    function (err) {
      if (err) {
        console.error(err);
        return res.redirect("/admin_edit_turmas?error=Erro ao criar turma");
      }

      res.redirect("/admin_edit_turmas?success=Turma criada com sucesso");
    }
  );
});

// Atualizar turma
app.post("/admin_edit_turmas/update", requireAuth("sAdmin"), (req, res) => {
  const { id_turma, nome_turma, docente, status, dt_inicial, dt_final } =
    req.body;

  db.run(
    `UPDATE TURMAS SET nome_turma = ?, docente = ?, status = ?, dt_inicial = ?, dt_final = ? 
     WHERE id_turma = ?`,
    [nome_turma, docente, status, dt_inicial, dt_final, id_turma],
    function (err) {
      if (err) {
        console.error(err);
        return res.redirect("/admin_edit_turmas?error=Erro ao atualizar turma");
      }

      res.redirect("/admin_edit_turmas?success=Turma atualizada com sucesso");
    }
  );
});

// Desativar turma
app.get(
  "/admin_edit_turmas/deactivate/:id",
  requireAuth("sAdmin"),
  (req, res) => {
    const id = req.params.id;

    db.run(
      "UPDATE TURMAS SET status = 0 WHERE id_turma = ?",
      [id],
      function (err) {
        if (err) {
          console.error(err);
          return res.redirect(
            "/admin_edit_turmas?error=Erro ao desativar turma"
          );
        }

        res.redirect("/admin_edit_turmas?success=Turma desativada com sucesso");
      }
    );
  }
);

// Ativar turma
app.get(
  "/admin_edit_turmas/activate/:id",
  requireAuth("sAdmin"),
  (req, res) => {
    const id = req.params.id;

    db.run(
      "UPDATE TURMAS SET status = 1 WHERE id_turma = ?",
      [id],
      function (err) {
        if (err) {
          console.error(err);
          return res.redirect("/admin_edit_turmas?error=Erro ao ativar turma");
        }

        res.redirect("/admin_edit_turmas?success=Turma ativada com sucesso");
      }
    );
  }
);

// Rota para gerenciar campanhas
app.get("/admin_edit_campanha", requireAuth("sAdmin"), (req, res) => {
  // Buscar campanhas
  db.all("SELECT * FROM CAMPANHAS", (err, campanhas) => {
    if (err) {
      console.error("Erro ao buscar campanhas:", err);
      return res.render("admin_edit_campanha", {
        campanhas: campanhas,
        turmas: turmas,
        itens: itens,
        error: "Erro ao carregar campanhas",
        user: req.session.user,
      });
    }

    // Buscar turmas para associar à campanha
    db.all("SELECT * FROM TURMAS WHERE status = 1", (err, turmas) => {
      if (err) {
        console.error("Erro ao buscar turmas:", err);
        return res.render("admin_edit_campanha", {
          campanhas: campanhas,
          turmas: turmas,
          itens: itens,
          error: "Erro ao carregar turmas",
          user: req.session.user,
        });
      }

      // Buscar itens
      db.all("SELECT * FROM ITENS WHERE status = 1", (err, itens) => {
        if (err) {
          console.error("Erro ao buscar itens:", err);
          return res.render("admin_edit_campanha", {
            campanhas: campanhas,
            turmas: itens,
            itens: itens,
            error: "Erro ao carregar itens",
            user: req.session.user,
          });
        }

        res.render("admin_edit_campanha", {
          campanhas: campanhas,
          turmas: turmas,
          itens: itens,
          success: req.query.success,
          error: req.query.error,
          user: req.session.user,
        });
      });
    });
  });
});

// Rota para processar a criação de campanhas
// ROTA CORRIGIDA
app.post("/admin_edit_campanha/create", requireAuth("sAdmin"), (req, res) => {
  console.log("POST /admin_edit_campanha/create - Dados:", req.body);
  
  const {
    nome_campanha,
    dt_inicial,
    dt_final,
    nome_item,      // Nome correto do campo
    pontos,         // Nome correto do campo
    turmas_selecionadas
  } = req.body;

  // Validar campos obrigatórios
  if (!nome_campanha || !dt_inicial || !dt_final || !nome_item || !pontos) {
    console.error("Campos obrigatórios faltando:", req.body);
    return res.redirect("/admin_edit_campanha?error=Todos os campos são obrigatórios");
  }

  db.serialize(() => {
    // 1. Criar a campanha
    db.run(
      `INSERT INTO CAMPANHAS (nome_campanha, dt_inicial, dt_final) 
       VALUES (?, ?, ?)`,
      [nome_campanha, dt_inicial, dt_final],
      function (err) {
        if (err) {
          console.error("Erro ao criar campanha:", err);
          return res.redirect("/admin_edit_campanha?error=Erro ao criar campanha");
        }

        const id_campanha = this.lastID;
        console.log("Campanha criada com ID:", id_campanha);

        // 2. Criar o item associado à campanha
        db.run(
          `INSERT INTO ITENS (nome_item, id_campanha, pontos) 
           VALUES (?, ?, ?)`,
          [nome_item, id_campanha, pontos],
          function (err) {
            if (err) {
              console.error("Erro ao criar item:", err);
              return res.redirect("/admin_edit_campanha?error=Erro ao criar item");
            }
            console.log("Item criado com ID:", this.lastID);

            // 3. Associar turmas à campanha (se houver)
            if (turmas_selecionadas) {
              const turmasArray = Array.isArray(turmas_selecionadas)
                ? turmas_selecionadas
                : [turmas_selecionadas];

              turmasArray.forEach((turmaId) => {
                db.run(
                  `INSERT INTO CAMPANHA_TURMAS (id_campanha, id_turma) VALUES (?, ?)`,
                  [id_campanha, turmaId],
                  function(err) {
                    if (err) console.error("Erro ao associar turma:", err);
                  }
                );
              });
            }

            res.redirect("/admin_edit_campanha?success=Campanha criada com sucesso");
          }
        );
      }
    );
  });
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
            if (!itensPorTurma[item.id_turma]) {
              itensPorTurma[item.id_turma] = [];
            }
            itensPorTurma[item.id_turma].push(item);
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
