-- SQLite
INSERT INTO ITENS (id_campanha, nome_item, pontos, status) VALUES
('1', 'MAIS_POLVORA', 10, 1),
('1', 'CANHOES', 15, 1),
('1', 'LARANJA', 7, 1);

SELECT id_turma, id_item, quantidade, pontos_total FROM DOACOES WHERE id_campanha = ?

`
SELECT
     d.id_campanha,
     d.id_turma,
     d.id_item,
     d.quantidade,
     d.pontos_total
   FROM DOACOES d
   LEFT JOIN CAMPANHAS c ON d
   LEFT JOIN TURMAS t ON d.id_turma = t.id_turma
   LEFT JOIN ITENS i ON d.id_item = i.id_item
   GROUP BY d.id_turma
   ORDER BY d.pontos_total DESC
   WHERE d.id_campanha = ?;
`;