# Projeto: Plataforma de Prescrição Médica Assistida com Anamnese por IA

## 1. Objetivo do Documento
Este documento define o plano completo para construir uma plataforma onde o médico cria uma prescrição e o sistema analisa automaticamente prontuário + histórico do paciente para verificar riscos, contraindicações e compatibilidade terapêutica.

Também serve como **checklist oficial de implementação** para acompanhamento contínuo (Codex, equipe técnica e produto).

---

## 2. Visão do Produto

### 2.1 Problema
No fluxo clínico tradicional, o médico precisa consolidar manualmente muitas fontes de informação (alergias, comorbidades, medicamentos atuais, histórico familiar, exames, eventos prévios) antes de prescrever. Isso aumenta risco de erro e tempo de consulta.

### 2.2 Solução
Criar um sistema com:
- Login/cadastro unificado.
- Área do médico.
- Área do paciente.
- Motor de análise clínica (regras + IA).
- Geração de anamnese estruturada por IA.
- Alertas de segurança e justificativa obrigatória quando necessário.
- Trilhas de auditoria e compliance (LGPD).

### 2.3 Objetivos de negócio
- Reduzir eventos adversos por prescrição.
- Aumentar segurança e padronização clínica.
- Melhorar produtividade do médico.
- Aumentar rastreabilidade das decisões médicas assistidas por IA.

---

## 3. Escopo

### 3.1 Escopo MVP
- Tela inicial com login/cadastro.
- Dois perfis com experiências separadas: médico e paciente.
- Cadastro/consulta de prontuário essencial.
- Prescrição médica com análise automática de risco.
- Anamnese gerada por IA para apoio à decisão.
- Registro da decisão médica sobre alertas.
- Auditoria mínima de ações sensíveis.

### 3.2 Fora do MVP (backlog futuro)
- Telemedicina integrada.
- Integração completa com prontuários hospitalares externos (HL7/FHIR avançado).
- Módulo financeiro/faturamento.
- Multi-hospital com tenancy avançado.
- App mobile nativo.

---

## 4. Perfis de Usuário

### 4.1 Médico
- Acessa prontuário do paciente.
- Cria prescrição e conduta.
- Consulta anamnese gerada por IA.
- Revisa alertas com severidade.
- Mantém/altera descarta recomendação da IA com justificativa.

### 4.2 Paciente
- Mantém dados clínicos básicos atualizados.
- Informa sintomas, alergias e medicamentos em uso.
- Visualiza prescrições e orientações liberadas.
- Pode reportar efeitos adversos (se habilitado).

### 4.3 Admin (recomendado)
- Gerencia usuários e permissões.
- Acompanha logs e indicadores operacionais.
- Configura parâmetros de segurança e auditoria.

---

## 5. Fluxos Principais

### 5.1 Fluxo de Login/Cadastro
1. Usuário acessa tela inicial.
2. Escolhe entrar ou cadastrar.
3. Sistema valida credenciais.
4. Sistema identifica perfil (médico/paciente/admin).
5. Redireciona para dashboard correto.

### 5.2 Fluxo do Médico
1. Médico busca/seleciona paciente.
2. Sistema mostra resumo clínico + dados críticos.
3. Médico preenche prescrição e conduta.
4. Sistema executa análise (regras + IA).
5. Sistema exibe alertas por severidade e anamnese estruturada.
6. Médico revisa, decide, justifica quando necessário.
7. Prescrição é finalizada e auditada.

### 5.3 Fluxo do Paciente
1. Paciente acessa área autenticada.
2. Atualiza dados clínicos permitidos.
3. Consulta orientações e prescrições liberadas.
4. Confirma ciência das orientações.

---

## 6. Requisitos Funcionais (RF)

### 6.1 Autenticação e Conta
- RF-001: Cadastro com perfil (médico/paciente).
- RF-002: Login por e-mail e senha.
- RF-003: Recuperação de senha.
- RF-004: Sessão segura com expiração.
- RF-005: (Recomendado) 2FA para médico.

### 6.2 Prontuário e Histórico
- RF-010: Registrar alergias.
- RF-011: Registrar comorbidades e antecedentes.
- RF-012: Registrar medicamentos em uso.
- RF-013: Registrar exames relevantes.
- RF-014: Linha do tempo clínica.
- RF-015: Histórico de alterações do prontuário.

### 6.3 Prescrição Assistida
- RF-020: Criar prescrição com itens (dose, frequência, duração, via).
- RF-021: Associar conduta não farmacológica.
- RF-022: Rodar análise automática antes de finalizar.
- RF-023: Classificar alertas por severidade (Crítico/Alto/Médio/Baixo).
- RF-024: Bloquear finalização em cenário crítico sem ação explícita.

### 6.4 Anamnese por IA
- RF-030: Gerar síntese estruturada da anamnese.
- RF-031: Exibir evidências usadas na análise.
- RF-032: Exibir limitações/avisos da IA.
- RF-033: Versionar prompt/modelo para rastreabilidade.

### 6.5 Decisão Médica e Auditoria
- RF-040: Médico marca alerta como aceito/revisado/ignorado.
- RF-041: Exigir justificativa em casos críticos.
- RF-042: Persistir decisão no prontuário.
- RF-043: Registrar log de ações sensíveis (quem, quando, recurso, IP).

### 6.6 Portal do Paciente
- RF-050: Visualizar prescrições liberadas.
- RF-051: Visualizar orientações e instruções de uso.
- RF-052: Confirmar leitura/ciência.
- RF-053: (Opcional) Reportar efeitos adversos.

---

## 7. Requisitos Não Funcionais (RNF)
- RNF-001: Segurança de transporte (TLS).
- RNF-002: Criptografia de dados sensíveis em repouso.
- RNF-003: Controle de acesso por papel e recurso (RBAC).
- RNF-004: Compliance LGPD com consentimento e rastreabilidade.
- RNF-005: Tempo de resposta da análise em até 8s no MVP (p95).
- RNF-006: Observabilidade com logs, métricas e alarmes.
- RNF-007: Disponibilidade alvo inicial: 99,5%.

---

## 8. Regras de Negócio Críticas
- RN-01: IA não substitui decisão médica.
- RN-02: Alerta crítico exige confirmação explícita do médico.
- RN-03: Alergia severa conhecida deve bloquear prescrição até ajuste/justificativa.
- RN-04: Toda recomendação deve exibir fonte de dado utilizada.
- RN-05: Toda decisão final deve ficar auditável.

---

## 9. Estrutura de Telas
- UI-01: Login/Cadastro.
- UI-02: Dashboard Médico.
- UI-03: Busca de Paciente e Prontuário (médico).
- UI-04: Prescrição + Alertas.
- UI-05: Anamnese IA detalhada.
- UI-06: Dashboard Paciente.
- UI-07: Perfil/Histórico Paciente.
- UI-08: Logs/Auditoria (admin/médico autorizado).

---

## 10. Arquitetura de Referência

### 10.1 Componentes
- Frontend web (ex.: Next.js).
- Backend API (ex.: Node.js + framework).
- Banco relacional (PostgreSQL).
- Serviço de análise clínica (regras determinísticas).
- Serviço de IA (síntese de anamnese + explicabilidade).
- Sistema de auditoria/logging.

### 10.2 Estratégia de IA (camadas)
1. Regras clínicas determinísticas (alergia, interação, duplicidade terapêutica, comorbidade).
2. IA generativa para organizar e sintetizar anamnese.
3. Pós-validação da saída (schema, consistência mínima, evidências).

### 10.3 Dados a persistir para rastreabilidade da IA
- Input consolidado usado pela IA.
- Output final da IA.
- Versão de prompt/modelo.
- Data/hora da execução.
- Usuário que acionou.

---

## 11. Modelo de Dados (alto nível)
- `users`
- `patients`
- `doctors`
- `medical_records`
- `allergies`
- `conditions`
- `current_medications`
- `prescriptions`
- `prescription_items`
- `ai_assessments`
- `risk_alerts`
- `doctor_decisions`
- `audit_logs`

---

## 12. Critérios de Aceite do MVP
- CA-01: Médico consegue criar prescrição completa.
- CA-02: Sistema cruza prescrição com prontuário e gera alertas.
- CA-03: Sistema gera anamnese IA estruturada e visível para o médico.
- CA-04: Alerta crítico exige ação explícita para finalizar.
- CA-05: Médico registra decisão com justificativa quando exigido.
- CA-06: Paciente visualiza conduta liberada.
- CA-07: Ações críticas ficam registradas em auditoria.

---

## 13. Métricas de Sucesso
- Taxa de alertas críticos detectados.
- Taxa de revisão de prescrição por alerta.
- Tempo médio para concluir prescrição.
- Concordância médico x recomendação IA.
- Taxa de eventos adversos reportados.
- NPS/Satisfação de médico e paciente.

---

## 14. Riscos e Mitigações
- R-01: IA produzir síntese incompleta.
  - Mitigação: camada de regras obrigatória + validação + revisão médica.
- R-02: Dados clínicos incompletos.
  - Mitigação: campos mínimos obrigatórios + aviso de completude.
- R-03: Vazamento de dados sensíveis.
  - Mitigação: criptografia, RBAC, auditoria, rotação de credenciais.
- R-04: Latência alta na análise.
  - Mitigação: otimização de consultas, cache e processamento assíncrono parcial.

---

## 15. Plano de Entregas por Fase

### Fase 1 - Fundação
- Identidade de usuário, autenticação, base de prontuário e estrutura de dados.

### Fase 2 - Prescrição e Alertas
- Fluxo médico de prescrição com motor de regras clínicas.

### Fase 3 - Anamnese IA
- Geração de resumo clínico, evidências e tomada de decisão registrada.

### Fase 4 - Robustez
- Compliance, auditoria avançada, testes de carga e monitoramento.

### Fase 5 - Operação
- Hardening final, go-live e estabilização pós-lançamento.

---

## 16. Checklist Mestre de Implementação

### 16.1 Legenda de status
- [ ] Não iniciado
- [~] Em andamento
- [x] Concluído
- [!] Bloqueado

### 16.2 Planejamento e Produto
- [ ] CK-PLAN-001 Definir escopo fechado do MVP.
- [ ] CK-PLAN-002 Definir personas e jornadas (médico/paciente/admin).
- [ ] CK-PLAN-003 Escrever critérios de aceite por funcionalidade.
- [ ] CK-PLAN-004 Mapear riscos clínicos, legais e técnicos.
- [ ] CK-PLAN-005 Definir priorização MoSCoW do backlog.
- [ ] CK-PLAN-006 Definir governança de mudanças (quem aprova o quê).

### 16.3 UX/UI
- [ ] CK-UX-001 Wireframe login/cadastro.
- [ ] CK-UX-002 Wireframe dashboard médico.
- [ ] CK-UX-003 Wireframe dashboard paciente.
- [ ] CK-UX-004 Fluxo de prescrição com alertas.
- [ ] CK-UX-005 Tela de anamnese IA com explicabilidade.
- [ ] CK-UX-006 Estados de erro/carregamento/sucesso em todas as telas.
- [ ] CK-UX-007 Definição de acessibilidade mínima (contraste, teclado, foco).

### 16.4 Frontend
- [x] CK-FE-001 Setup base do frontend.
- [x] CK-FE-002 Tela inicial login/cadastro funcional.
- [x] CK-FE-003 Guardas de rota por perfil.
- [x] CK-FE-004 Dashboard médico com cards clínicos críticos.
- [x] CK-FE-005 Busca e abertura de prontuário do paciente.
- [x] CK-FE-006 Formulário de prescrição (medicamento/dose/frequência/duração).
- [x] CK-FE-007 Exibição de alertas por severidade.
- [x] CK-FE-008 Tela de anamnese IA estruturada.
- [x] CK-FE-009 Registro da decisão médica por alerta.
- [x] CK-FE-010 Dashboard paciente com prescrições e orientações.
- [x] CK-FE-011 Atualização de histórico permitido ao paciente.
- [x] CK-FE-012 Testes de componentes críticos.

### 16.5 Backend/API
- [x] CK-BE-001 Setup base da API.
- [x] CK-BE-002 Autenticação (login, refresh, recuperação de senha).
- [x] CK-BE-003 Autorização por perfil (RBAC).
- [x] CK-BE-004 CRUD de prontuário e histórico clínico.
- [x] CK-BE-005 CRUD de prescrição e itens da prescrição.
- [x] CK-BE-006 Endpoint de execução da análise clínica.
- [x] CK-BE-007 Endpoint de anamnese IA.
- [x] CK-BE-008 Endpoint de decisão médica (aceitar/revisar/ignorar).
- [x] CK-BE-009 Endpoint de consulta de auditoria.
- [x] CK-BE-010 Tratamento padronizado de erros e validação de schema.

### 16.6 Banco de Dados
- [x] CK-DB-001 Modelagem lógica e física inicial.
- [x] CK-DB-002 Migrations versionadas.
- [x] CK-DB-003 Índices para consultas clínicas críticas.
- [x] CK-DB-004 Estratégia de versionamento do prontuário.
- [x] CK-DB-005 Seeds com dados fictícios consistentes.
- [ ] CK-DB-006 Política de backup/restore testada.

### 16.7 Regras Clínicas + IA
- [~] CK-AI-001 Definir contrato de entrada (dados clínicos mínimos).
- [x] CK-AI-002 Implementar regras de alergia.
- [x] CK-AI-003 Implementar regras de interação medicamentosa.
- [x] CK-AI-004 Implementar regras por comorbidade e fatores de risco.
- [x] CK-AI-005 Definir schema da anamnese estruturada de saída.
- [ ] CK-AI-006 Integrar modelo de IA para síntese.
- [x] CK-AI-007 Implementar pós-validação da saída.
- [x] CK-AI-008 Persistir input/output/versionamento da IA.
- [~] CK-AI-009 Exibir evidências e justificativas por alerta.
- [x] CK-AI-010 Criar testes de regressão para regras clínicas.

### 16.8 Segurança e LGPD
- [ ] CK-SEC-001 TLS em todos ambientes.
- [ ] CK-SEC-002 Criptografia de dados sensíveis em repouso.
- [ ] CK-SEC-003 Política de senha e bloqueio por tentativas.
- [ ] CK-SEC-004 2FA para médicos (se no MVP, obrigatório).
- [ ] CK-SEC-005 Consentimento explícito para dados sensíveis.
- [ ] CK-SEC-006 Fluxo de revogação de consentimento.
- [ ] CK-SEC-007 Registro e retenção de auditoria conforme política.
- [ ] CK-SEC-008 Revisão de permissões por endpoint.

### 16.9 Testes e Qualidade
- [~] CK-QA-001 Testes unitários backend.
- [~] CK-QA-002 Testes de integração API.
- [ ] CK-QA-003 Testes E2E fluxo médico (fim a fim).
- [ ] CK-QA-004 Testes E2E fluxo paciente.
- [ ] CK-QA-005 Testes de segurança (authn/authz).
- [ ] CK-QA-006 Testes de performance da análise clínica.
- [ ] CK-QA-007 UAT com profissionais de saúde.
- [ ] CK-QA-008 Plano de correção de bugs críticos pré-go-live.

### 16.10 DevOps e Operação
- [ ] CK-OPS-001 Pipeline CI/CD.
- [ ] CK-OPS-002 Estratégia de ambientes (dev/hml/prod).
- [ ] CK-OPS-003 Gestão de segredos (secrets).
- [ ] CK-OPS-004 Monitoramento (logs, métricas, traces).
- [ ] CK-OPS-005 Alertas operacionais e on-call.
- [ ] CK-OPS-006 Runbook de incidentes.
- [ ] CK-OPS-007 Plano de rollback validado.

### 16.11 Go-Live
- [ ] CK-LIVE-001 Checklist de segurança aprovado.
- [ ] CK-LIVE-002 Checklist de compliance aprovado.
- [ ] CK-LIVE-003 Treinamento mínimo das equipes usuárias.
- [ ] CK-LIVE-004 Publicação controlada (rollout gradual).
- [ ] CK-LIVE-005 Monitoramento intensivo na primeira semana.
- [ ] CK-LIVE-006 Retrospectiva e plano de melhorias pós go-live.

---

## 17. Controle Operacional de Sprint (modelo)

### 17.1 Sprint atual
- Objetivo: Iniciar backend MVP com auth, prontuário, prescrição, análise clínica, anamnese IA e auditoria.
- Data de início: 2026-03-04
- Data de fim: 2026-03-11
- Responsáveis: João + Codex

### 17.2 Itens concluídos
- [x] Estrutura base da API Node.js/TypeScript criada.
- [x] Endpoints de auth (register/login) com JWT implementados.
- [x] Refresh token e recuperação de senha implementados (`/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`).
- [x] RBAC por perfil (doctor/patient/admin) implementado.
- [x] Endpoint de análise clínica com regra de alergia e duplicidade implementado.
- [x] CRUD de prontuário com histórico de alterações implementado.
- [x] CRUD de prescrição (listar, detalhar, atualizar e cancelar) implementado.
- [x] Endpoint dedicado de anamnese IA implementado (`GET /ai/anamnesis/:prescriptionId`).
- [x] Endpoint de decisão médica por alerta com justificativa obrigatória para crítico.
- [x] Endpoint de auditoria (`/audit-logs`) implementado.
- [x] Regras clínicas expandidas para interação medicamentosa e comorbidade.
- [x] Estrutura inicial de banco (modelagem SQL + migration versionada + seed) criada.
- [x] Testes de regressão das regras clínicas adicionados (alergia/interação/comorbidade).
- [x] Testes de integração iniciais da API adicionados (health/login).
- [x] Base do Sequelize adicionada no backend (`sequelize.ts`, models iniciais e rota `GET /db/health`).
- [x] Frontend Next.js + TypeScript criado em `frontend-next` com build e lint funcionando.
- [x] UI-01 implementada (`/login`) com login/cadastro, persistência de sessão e redirecionamento por perfil.
- [x] Guardas de rota por perfil implementadas via `middleware.ts` + `useAuthRedirect`.
- [x] UI-02/UI-03/UI-04/UI-05 implementadas (dashboard médico, prontuário, prescrição com alertas e anamnese IA).
- [x] UI-06/UI-07/UI-08 implementadas (dashboard paciente, perfil/histórico, auditoria admin).
- [x] Dashboard do paciente ajustado para integração estrita com API real (sem mocks), com tentativa de `/patients/me/prescriptions` e fallback para `/prescriptions`.
- [x] Componentes reutilizáveis implementados: `AlertBadge`, `PrescriptionForm`, `AnamnesisCard`, `AuditTable`.
- [x] Testes FE críticos implementados e aprovados (`login-form.test.tsx`, `prescription-form.test.tsx`, `alerts-list.test.tsx`).
- [x] Ambiente frontend configurado com `.env.example` e `.env.local` em `frontend-next` (`NEXT_PUBLIC_API_BASE_URL=http://localhost:3333`).

### 17.3 Itens em andamento
- [~] Hardening de autenticação (envio real de recuperação por e-mail e revogação robusta de sessão).
- [~] Persistência ainda em memória (migração para MySQL via Sequelize em andamento).
- [~] Testes unitários iniciais criados para auth e análise clínica.
- [~] Aplicar migrations/seeds em ambiente MySQL e conectar API ao banco.
- [~] Expandir suíte de integração para fluxos de prescrição, alertas e auditoria.
- [~] Ajuste de contrato backend pendente para experiência plena do paciente: rota de prescrições para perfil `patient` (atualmente `GET /prescriptions` retorna 403 para paciente).

### 17.4 Itens bloqueados
- [ ]

### 17.5 Decisões técnicas tomadas
- [x] Backend inicial em Node.js + TypeScript + Express.
- [x] Persistência inicial em memória com seeds para acelerar validação de fluxo.
- [x] Estratégia de persistência escolhida: MySQL + Sequelize (início da integração realizado).
- [x] Validação de payload com Zod e tratamento padronizado de erros.
- [x] Auditoria mínima obrigatória em ações sensíveis.

### 17.6 Próximos passos
- [ ] Conectar definitivamente as rotas de negócio ao MySQL via Sequelize (substituindo store em memória).
- [ ] Aumentar cobertura de testes unitários e de integração dos endpoints críticos.
- [ ] Ajustar autorização de leitura de prescrições para perfil `patient` (ou expor endpoint dedicado `/patients/me/prescriptions`).

### 17.7 Passo a passo técnico (execução real)
- [x] Passo 01: Subir MySQL em Docker e validar conexão (`/db/health`).
- [x] Passo 02: Configurar `sequelize-cli` (`.sequelizerc`, config e migrations CLI).
- [x] Passo 03: Executar migrations e validar criação de tabelas.
- [x] Passo 04: Criar models Sequelize para tabelas centrais de domínio.
- [x] Passo 05: Migrar serviço de autenticação para MySQL/Sequelize.
- [x] Passo 06: Migrar rotas de pacientes/prontuário para MySQL/Sequelize.
- [x] Passo 07: Migrar análise clínica (alertas + anamnese) para MySQL/Sequelize.
- [x] Passo 08: Migrar rotas de prescrição/decisão para MySQL/Sequelize.
- [x] Passo 09: Migrar auditoria para persistência real no banco.
- [~] Passo 10: Remover dependência residual de `domain/store` nos testes legados.
- [ ] Passo 11: Expandir testes de integração para validar fluxos 100% banco.

---

## 18. Quadro de Rastreabilidade (preencher conforme implementação)
| ID | Requisito | Implementado em | Status | Evidência (PR/Teste) |
|---|---|---|---|---|
| RF-001 | Cadastro com perfil | `backend/src/routes/auth-routes.ts` | [x] | Fluxo implementado em memória |
| RF-020 | Prescrição assistida | `backend/src/routes/prescription-routes.ts` | [x] | CRUD principal + análise + decisão médica |
| RF-030 | Anamnese IA | `backend/src/routes/ai-routes.ts` | [~] | Endpoint dedicado implementado; integração com modelo externo pendente |
| RF-043 | Auditoria de ações críticas | `backend/src/services/audit-service.ts` | [x] | Log em auth/prescrição/análise/decisão |
| RF-023 | Alertas por severidade | `backend/src/services/analysis-service.ts` | [x] | Regras de alergia, duplicidade, interação e comorbidade |
| RF-002 | Login por e-mail e senha (frontend) | `frontend-next/src/app/login/page.tsx`, `frontend-next/src/components/login-form.tsx` | [x] | Fluxo login/cadastro funcional com validação |
| RF-003 | Controle de sessão e perfil (frontend) | `frontend-next/src/providers/auth-provider.tsx`, `frontend-next/middleware.ts` | [x] | Persistência de token e guardas por papel |
| RF-020 | Prescrição com itens (frontend) | `frontend-next/src/components/prescription-form.tsx`, `frontend-next/src/app/doctor/prescriptions/new/page.tsx` | [x] | Formulário com medicamento/dose/frequência/duração/via |
| RF-030 | Anamnese IA detalhada (frontend) | `frontend-next/src/app/doctor/anamnesis/[prescriptionId]/page.tsx`, `frontend-next/src/components/anamnesis-card.tsx` | [x] | Exibição estruturada (resumo, destaques, limitações) |
| RF-040 | Decisão médica por alerta (frontend) | `frontend-next/src/app/doctor/prescriptions/[id]/page.tsx` | [x] | Ações aceitar/revisar/ignorar com justificativa |
| RF-050 | Portal paciente - prescrições (frontend) | `frontend-next/src/app/patient/dashboard/page.tsx` | [~] | Tela implementada; backend atual retorna 403 para paciente em `/prescriptions` |
| RF-011 | Atualização de histórico clínico (frontend) | `frontend-next/src/app/patient/profile/page.tsx` | [x] | Edição de alergias/condições/medicação via `PATCH /patients/:id/record` |

---

## 19. Definição de Pronto (Definition of Done)
Uma funcionalidade só é considerada pronta quando:
- Código implementado e revisado.
- Testes automatizados relevantes passando.
- Critérios de aceite atendidos.
- Logs/auditoria aplicáveis implementados.
- Documentação mínima atualizada.
- Sem bugs críticos abertos para o fluxo entregue.

---

## 20. Observações Finais
- Este sistema é suporte à decisão clínica, não substituição do médico.
- A camada de IA deve ser sempre explicável e auditável.
- Este checklist deve ser atualizado continuamente a cada sprint.
