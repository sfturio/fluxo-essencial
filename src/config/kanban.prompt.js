export const KANBAN_PROMPT_TEMPLATE = `Transforme a ideia abaixo em tarefas acionáveis para Kanban.

Regras:
- Separe tarefas usando ";"
- Comece com verbos (criar, implementar, corrigir, adicionar)
- Use:
  ! = mover para "Em andamento"
  !! = alta prioridade
  ( ) = categoria
  @ = responsável
  # = tags
  + = data (DD-MM-AAAA)
- Mantenha tarefas curtas
- Sem explicações

Exemplo:
!criar API (manhã) @joao #backend +05-04-2026

Ideia:
`;
