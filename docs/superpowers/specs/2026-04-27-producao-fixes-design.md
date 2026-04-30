# Be Fluent School — Spec: Correções para Produção + Refinamento de Design
**Data:** 2026-04-27  
**Escopo:** Sub-projetos A (bugs críticos), B (design), C (polimento)

---

## Sub-projeto A — Correções Críticas

### A1: Delete / Inativação de Usuário
- **Comportamento:** Soft-delete — dados ficam no banco, usuário some da UI
- **Backend:** Query de listagem `/api/profiles` adiciona `WHERE is_active = true` (ou equivalente no storage)
- **Frontend:** Após mutação DELETE, invalidar `['/api/profiles']` e `['/api/teachers']`
- **Resultado:** Lixeira vermelha remove da tela imediatamente, sem recarregar página

### A2: Sincronização de Status Professor
- **Causa:** `/api/profiles` e `/api/teachers` são fontes separadas sem invalidação cruzada
- **Fix:** Toda mutação de status em UserManagement invalida também `['/api/teachers']` e vice-versa
- **Fix backend:** Endpoint `/api/teachers/:id` PUT e `/api/users/:id` DELETE devem operar no mesmo `is_active` do profile

### A3: Modal de Redistribuição de Alunos
**Trigger:** Clique em excluir ou inativar professor (aba Usuários ou aba Professores)

**Fluxo:**
1. Sistema checa `/api/teachers/:id/students` — alunos ativos com aulas futuras
2. Se vazio → confirm dialog simples → executa ação
3. Se tem alunos → abre Modal de Redistribuição:
   - Header: "Prof. [Nome] tem [N] aluno(s) ativo(s)"
   - Lista de alunos: nome + próxima aula agendada
   - Por aluno: dropdown de novo professor
   - Dropdown mostra: nome do professor + horários disponíveis (slot semanal)
   - Botão "Confirmar" desabilitado até todos terem novo professor selecionado
4. Ao confirmar: PATCH cada aluno para novo professor → então DELETE/PATCH professor

**Endpoints necessários:**
- `GET /api/teachers/:id/students` — alunos vinculados ao professor
- `GET /api/teachers` — lista com campo `availability` para o dropdown
- `PATCH /api/students/:id` — atualizar professor vinculado

### A4: FeedbackSystem.jsx
- Mover `const [selectedFeedbackType, setSelectedFeedbackType] = useState('general')` para antes de todos os hooks
- Adicionar `queryFn: () => apiRequest('/feedbacks')` no useQuery de feedbacks
- Corrigir `.toLocaleDateString()` sem `new Date()` — envolver em `new Date(val).toLocaleDateString()`

### A5: Bugs UserManagement
- Toggle status: `user.status !== 'active'` → `!user.isActive`
- Estatísticas undefined: remover campos `totalClasses`/`rating` ou buscar de endpoint real
- Invalidar `['/api/teachers']` após toda mutação de usuário com role teacher

---

## Sub-projeto B — Refinamento de Design

Aplicar o mesmo sistema Dark Glass OS (variáveis CSS `--s0..s4`, `--b1..b3`, `--amber`, classes `.db-panel`, `.db-row`, `.db-pill`, `.db-ghost`) nas seções:

- **Mensagens** (`MessageCenter.jsx`) — layout de inbox com lista + painel de leitura
- **Pagamentos** (`PaymentSystem.jsx`) — cards de status + histórico de transações
- **Fórum** (`ForumSection.jsx`) — lista de posts com like/reply
- **Feedback** (`StudentFeedback.jsx` + `FeedbackSystem.jsx`) — form de avaliação + histórico

---

## Sub-projeto C — Polimento

- **NotificationCenter:** Verificar se badge aparece corretamente no topbar
- **Feedback nos 3 perfis:** Admin vê todos os feedbacks; Teacher vê feedbacks recebidos de alunos; Student usa StudentFeedback
- **Contagem de alunos por professor:** TeacherManagement busca count real em vez de hardcoded 0
- **ForumSection TODOs:** Implementar replies count e last reply via backend

---

## Ordem de Implementação
1. A1 → A2 (backend primeiro, depois frontend)
2. A3 (modal redistribuição — maior complexidade)
3. A4 → A5 (correções de componentes)
4. B (design das 4 seções)
5. C (polimento)
