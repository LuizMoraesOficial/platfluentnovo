# Spec: Correções do Dashboard — Be Fluent School
**Data:** 2026-04-25  
**Escopo:** Corrigir todos os caminhos, botões e funcionalidades incorretas ou ausentes no dashboard da plataforma, de acordo com a Documentação Oficial.

---

## 1. Contexto

A plataforma Be Fluent School é uma área de membros para alunos, professores e administradores. O objetivo é centralizar aulas, materiais, agendamentos, prática de inglês e suporte em um único ambiente.

A análise do código revelou **10 categorias de problemas** que impedem a plataforma de funcionar conforme especificado. Este documento descreve cada problema e a correção exata a aplicar.

---

## 2. Problemas e Correções

### P1 — Dados hardcoded (mock data) em toda a plataforma

**Afetados:** `StudentDashboard.jsx`, `ProgressTracker.jsx`, `renderStudentsSection`, `renderTeachersSection`, `renderClassesSection`, `renderAnnouncementsSection`, `ChatSupport.jsx`

**Problema:** Todos os cards e tabelas mostram valores estáticos no código (nome "Prof. Isabella", "Aluno Teste", aulas fictícias, tickets pré-criados). Nenhum dado vem do banco.

**Correção:**
- Conectar `StudentDashboard` ao endpoint `/api/schedule` para próxima aula real
- Conectar `StudentDashboard` ao endpoint `/api/profile` para nível atual do aluno
- Conectar `ProgressTracker` ao endpoint `/api/progress` para XP e achievements reais
- Conectar `renderStudentsSection` ao endpoint existente `/api/admin/students`
- Conectar `renderTeachersSection` ao endpoint `/api/admin/teachers`
- Conectar `renderClassesSection` ao endpoint `/api/classes`
- Conectar `renderAnnouncementsSection` ao endpoint `/api/announcements`
- Remover todos os valores estáticos e tickets hardcoded do `ChatSupport`

---

### P2 — Formulários que não salvam dados reais

**Afetados:** "Adicionar Aluno", "Adicionar Professor", "Criar Nova Aula", "Criar Novo Aviso", "Criar Sala Meet"

**Problema:** Os formulários de criação exibem um toast genérico ("Redirecionando...") e não fazem nenhuma chamada de API. Os dados preenchidos são descartados.

**Correção:**
- "Adicionar Aluno": fazer `POST /api/admin/users` com os dados do form e invalidar query de alunos
- "Adicionar Professor": fazer `POST /api/admin/users` (role=teacher) e invalidar query de professores
- "Criar Nova Aula": fazer `POST /api/classes` com todos os campos e invalidar lista de aulas
- "Criar Novo Aviso": fazer `POST /api/announcements` e invalidar lista de avisos
- "Criar Sala Meet": fazer `POST /api/meet-links` para persistir no banco, não só em estado local
- Todos os formulários: mostrar loading durante submit, erro real em caso de falha, fechar modal só após sucesso

---

### P3 — OlivIA (Chat com IA) ausente

**Problema:** A documentação especifica um assistente chamado "OlivIA" para prática de inglês com conversação em inglês, esclarecimento de dúvidas gramaticais e simulação de diálogos profissionais. O que existe é um bot de keyword-matching para suporte técnico (sem IA real).

**Correção:**
- Criar componente `OlivIA.jsx` separado do `ChatSupport.jsx`
- Adicionar item "OlivIA" no menu do aluno (ícone: `Bot`)
- Integrar com a API do Claude (`claude-haiku-4-5`) via endpoint backend `/api/olivia/chat`
- O backend recebe a mensagem e responde com prompt de sistema instruindo o modelo a atuar como tutora de inglês da Be Fluent
- O `ChatSupport.jsx` permanece para suporte técnico, `OlivIA.jsx` serve para prática de inglês
- Interface: chat simples com histórico de mensagens, indicador de digitação, campo de texto + botão enviar

---

### P4 — Teste de Proficiência inacessível pelo dashboard

**Problema:** A página `/nivelamento` existe mas não há nenhum link ou botão para ela no dashboard do aluno.

**Correção:**
- Adicionar item "Teste de Nível" no menu do aluno (ícone: `GraduationCap`, id: `nivelamento`)
- No handler de navegação do `Dashboard.jsx`, ao clicar em `nivelamento`: `window.location.href = '/nivelamento'` (ou `useNavigate('/nivelamento')`)
- Adicionar card de acesso rápido no `StudentDashboard` principal com botão "Fazer Teste de Nível"

---

### P5 — Botão "Entrar" em aulas abre link fictício

**Problema:** O botão "Entrar" nas aulas abre `https://meet.google.com/sample-meet-link` — um link inexistente.

**Correção:**
- A seção de "Próximas Aulas" deve buscar dados reais de `/api/schedule?studentId=...`
- Cada aula retornada pelo backend deve conter o campo `meet_link`
- O botão "Entrar" usa `window.open(aula.meet_link, '_blank')` com o link real
- Se a aula não tem link ainda, o botão fica desabilitado com tooltip "Link será enviado em breve"

---

### P6 — Materiais Didáticos sem conteúdo

**Problema:** `StudyMaterials.jsx` mostra apenas "Aguardando Materiais" com contadores zerados. Não há como admin/professor fazer upload nem aluno fazer download.

**Correção:**
- Buscar materiais de `/api/materials?level=<nivel_do_aluno>` via React Query
- Se não há materiais: exibir mensagem vazia correta (já está implementado de forma razoável, mas precisa de dados reais)
- Para admin/professor: adicionar botão "Enviar Material" com form de upload (título, nível, tipo, arquivo)
- Upload: `POST /api/materials` com `multipart/form-data`
- Para aluno: botão "Download" em cada material que faz `GET /api/materials/:id/download`
- Organizar por nível: Start, Intermediate, Advanced (tabs ou filtro)

---

### P7 — Seção "schedule" não existe no Dashboard.jsx

**Problema:** O menu do aluno tem item `schedule` ("Minhas Aulas") mas `Dashboard.jsx` não tem um `renderScheduleSection()`. Clicar no item não renderiza nada visível.

**Correção:**
- Criar `renderScheduleSection()` em `Dashboard.jsx`
- Exibir lista das aulas do aluno vindas de `/api/schedule?studentId=...`
- Cada item: data, hora, professor, tipo (individual/grupo), link Meet, status (agendada/concluída/cancelada)
- Botão "Agendar Nova Aula": abrir link de agendamento externo (Calendly/Google Agenda) configurável pelo admin
- Botão "Remarcar": navegar para `reschedule`

---

### P8 — Título do header mostra ID técnico

**Problema:** O header exibe `activeSection` diretamente, mostrando strings como "study-materials", "teacher-classes" em vez de nomes legíveis.

**Correção:**
- Criar mapa `sectionLabels` em `Dashboard.jsx`:
  ```js
  const sectionLabels = {
    dashboard: 'Dashboard',
    schedule: 'Minhas Aulas',
    'study-materials': 'Materiais de Estudo',
    'teacher-classes': 'Minhas Aulas',
    'meet-links': 'Links Google Meet',
    'learning-path': 'Trilha de Aprendizado',
    nivelamento: 'Teste de Nível',
    // ... todas as seções
  }
  ```
- No header: `sectionLabels[activeSection] || activeSection`

---

### P9 — Seção "learning-path" não tem handler

**Problema:** `StudentDashboard.jsx` navega para `learning-path` ao clicar no card "Nível Atual", mas `Dashboard.jsx` não renderiza nada para esse ID. Tela fica em branco.

**Correção:**
- Verificar se `LazyLearningPath` já está importado (sim, está em `LazyComponents.jsx`)
- Adicionar case `learning-path` no switch de renderização do `Dashboard.jsx` apontando para `<LazyLearningPath />`
- Conectar `LearningPath` a dados reais do aluno via `/api/profile` (nível, progresso)

---

### P10 — Proteção de rotas desabilitada

**Problema:** `EnhancedProtectedRoute` está comentado em `App.jsx`. Qualquer usuário não autenticado pode acessar `/dashboard`.

**Correção:**
- Reabilitar `ProtectedRoute` (o componente simples em `components/ProtectedRoute.jsx` já existe e funciona)
- Envolver a rota `/dashboard` com `<ProtectedRoute>` no `App.jsx`
- Fazer o mesmo para `/admin/*`, `/teacher/*`, `/student/*`
- Testar que ao acessar sem login redireciona para `/auth`

---

## 3. Prioridade de Implementação

| # | Problema | Impacto | Esforço | Prioridade |
|---|----------|---------|---------|------------|
| P10 | Proteção de rotas | Segurança crítica | Baixo | 🔴 1 |
| P8 | Título do header | UX básica | Baixo | 🟠 2 |
| P9 | learning-path sem handler | Tela branca | Baixo | 🟠 3 |
| P7 | schedule sem render | Funcionalidade core | Médio | 🟠 4 |
| P4 | Teste de proficiência inacessível | Funcionalidade core | Baixo | 🟠 5 |
| P5 | Link Meet fictício | Funcionalidade crítica | Médio | 🔴 6 |
| P1 | Dados hardcoded | Funcionalidade core | Alto | 🟡 7 |
| P2 | Formulários sem API | Funcionalidade core | Alto | 🟡 8 |
| P6 | Materiais sem conteúdo | Funcionalidade core | Alto | 🟡 9 |
| P3 | OlivIA ausente | Feature estratégica | Alto | 🟢 10 |

---

## 4. Arquivos Principais Afetados

- `frontend/src/App.jsx` — P10
- `frontend/src/pages/Dashboard.jsx` — P7, P8, P9, P1 (parcial), P2
- `frontend/src/components/dashboard/sections/StudentDashboard.jsx` — P1, P4, P5
- `frontend/src/components/student/StudyMaterials.jsx` — P6
- `frontend/src/components/student/LearningPath.jsx` — P9
- `frontend/src/components/gamification/ProgressTracker.jsx` — P1
- `frontend/src/components/support/ChatSupport.jsx` — P1 (tickets hardcoded)
- `frontend/src/components/olivia/OlivIA.jsx` — P3 (novo arquivo)
- `backend/src/routes/olivia.js` — P3 (novo endpoint)

---

## 5. Fora do Escopo desta Iteração

- Integração com CRM, n8n, WhatsApp Business API (roadmap futuro conforme doc)
- Dashboard de métricas avançadas (CAC, LTV, retenção)
- IA de voz para OlivIA
- Supabase/Firebase migration
