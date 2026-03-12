# Plano de Onboarding Obrigatorio do Paciente Antes do Acesso a Plataforma

## Estado atual

Hoje o cadastro do paciente acontece com dados minimos:

- `name`
- `email`
- `password`
- `role`
- `clinicJoinCode`

Baseado no fluxo atual:

- O frontend concentra login/cadastro em `frontend-next/src/components/login-form.tsx`.
- O backend valida o cadastro em `backend/src/routes/auth-routes.ts`.
- A criacao do usuario/perfil ocorre em `backend/src/services/auth-service.ts`.
- O perfil `patients` hoje guarda basicamente `id`, `userId`, `clinicId`, `birthDate` e `createdAt`.

Conclusao: o sistema hoje autentica e redireciona o paciente cedo demais, antes de captar dados cadastrais e clinicos basicos para uso operacional.

## Objetivo

Impedir que o paciente entre de fato na plataforma logo apos o cadastro/login sem antes completar um onboarding obrigatorio com dados pessoais e de contato.

## Dados recomendados para onboarding obrigatorio

### Identificacao minima

- Data de nascimento
- Sexo biologico (`masculino` ou `feminino`)
- Telefone

### Endereco

- CEP
- Rua
- Numero
- Complemento
- Bairro
- Cidade
- Estado

### Contato de seguranca

- Nome do contato de emergencia
- Telefone do contato de emergencia

## Decisao de produto sugerida

Separar o fluxo em duas etapas:

1. `Cadastro de conta`
   - Nome
   - E-mail
   - Senha
   - Perfil
   - Codigo da clinica

2. `Onboarding obrigatorio`
   - Dados pessoais/complementares
   - Endereco
   - Contato de emergencia

So depois disso o paciente entra em `/patient/dashboard`.

## Regra funcional sugerida

### Cadastro

- Ao registrar paciente, criar o usuario normalmente.
- Criar o perfil `patients` com `onboardingCompleted = false`.
- Fazer login automatico apenas se isso ja fizer parte da UX atual, mas redirecionar para `/patient/onboarding`.

### Login

- Se `role !== patient`, manter comportamento atual.
- Se `role === patient` e `onboardingCompleted === false`, redirecionar para `/patient/onboarding`.
- Se `role === patient` e `onboardingCompleted === true`, redirecionar para `/patient/dashboard`.

### Guard de rota

- Rotas de paciente devem bloquear acesso ao dashboard, perfil e demais paginas enquanto o onboarding nao estiver completo.
- Excecao: permitir `/patient/onboarding`, `/logout` e eventualmente suporte/ajuda.

## Ajuste de banco necessario

O banco atual nao esta propicio para esse fluxo completo, porque o perfil do paciente nao possui campos suficientes para cadastro complementar nem um status explicito de conclusao do onboarding.

Por isso foi criada a migration:

- `backend/db/migrations-cli/20260311143000-add-patient-onboarding-profile-fields.cjs`

Ela adiciona:

- `biological_sex`
- `phone`
- `address_zip_code`
- `address_street`
- `address_number`
- `address_complement`
- `address_neighborhood`
- `address_city`
- `address_state`
- `emergency_contact_name`
- `emergency_contact_phone`
- `onboarding_completed`
- `onboarding_completed_at`

Tambem foi atualizado o modelo:

- `backend/src/db/models/patient-model.ts`

E o tipo do frontend:

- `frontend-next/src/types/domain.ts`

## Uso do sexo biologico na anamnese

Esse campo deve ser tratado como dado estruturado do perfil do paciente e tambem como insumo para a anamnese.

Objetivo:

- Permitir liberar perguntas especificas de sexo biologico com mais confiabilidade.
- Evitar depender apenas de resposta livre no formulario quando essa informacao ja tiver sido preenchida no onboarding.

Aplicacao recomendada:

- No onboarding, o paciente informa `masculino` ou `feminino`.
- Na anamnese, esse valor pode preencher automaticamente a pergunta `biological_sex` ou servir como fallback.
- As perguntas condicionais femininas e masculinas continuam sendo exibidas a partir desse valor.

## Plano tecnico de implementacao

### Fase 1: base de dados

- [x] Adicionar colunas de onboarding no perfil do paciente.
- [ ] Executar migration no ambiente alvo.

### Fase 2: backend

- [ ] Criar endpoint `GET /patients/me/profile` para retornar o perfil do paciente logado.
- [ ] Criar endpoint `PUT /patients/me/profile` para salvar os dados do onboarding.
- [ ] Validar campos obrigatorios do onboarding com `zod`.
- [ ] Atualizar `onboardingCompleted` e `onboardingCompletedAt` somente quando todos os campos obrigatorios estiverem preenchidos.
- [ ] Garantir auditoria para leitura e atualizacao do perfil.
- [ ] Expor `biologicalSex` para reaproveitamento na anamnese.

### Fase 3: autenticacao e redirecionamento

- [ ] Incluir `onboardingCompleted` no payload necessario para decisao de redirecionamento.
- [ ] Ajustar `middleware.ts` e/ou `role-utils.ts` para levar paciente incompleto para `/patient/onboarding`.
- [ ] Garantir que um paciente incompleto nao consiga acessar `/patient/dashboard`.

### Fase 4: frontend

- [ ] Criar pagina `frontend-next/src/app/patient/onboarding/page.tsx`.
- [ ] Organizar o formulario em blocos:
  - Dados pessoais
  - Endereco
  - Contato de emergencia
- [ ] Incluir selecao obrigatoria de sexo biologico no bloco de dados pessoais.
- [ ] Exibir progresso visual e validacoes objetivas.
- [ ] Salvar rascunho quando fizer sentido.
- [ ] Ao concluir, redirecionar para `/patient/dashboard`.

### Fase 5: experiencia do usuario

- [ ] Ajustar o texto da tela de cadastro para deixar claro que o preenchimento do perfil continua na etapa seguinte.
- [ ] Exibir mensagem de bloqueio amigavel quando o paciente tentar acessar paginas internas sem onboarding concluido.
- [ ] Considerar reaproveitar parte do onboarding para iniciar a anamnese depois do cadastro basico.

### Fase 6: testes

- [ ] Teste de cadastro de paciente seguido de redirecionamento para onboarding.
- [ ] Teste de login de paciente com onboarding pendente.
- [ ] Teste de login de paciente com onboarding concluido.
- [ ] Teste de bloqueio de rotas internas para paciente incompleto.
- [ ] Teste de persistencia do perfil complementar.
- [ ] Teste de uso de `biologicalSex` como base para perguntas condicionais da anamnese.

## Ordem recomendada de execucao

1. Rodar a migration.
2. Implementar `GET/PUT /patients/me/profile`.
3. Implementar a tela `/patient/onboarding`.
4. Ajustar redirecionamento pos-login/cadastro.
5. Fechar guards de rota.
6. Cobrir com testes.

## Observacoes

- `birthDate` ja existe no banco, entao deve ser reaproveitado em vez de duplicado.
- `biologicalSex` deve ser campo estruturado do perfil e nao apenas resposta solta da anamnese.
- Se voces quiserem evoluir o onboarding depois, faz sentido considerar:
  - CPF
  - identidade de genero, separada de sexo biologico se isso fizer sentido para a regra clinica e para UX
  - convenio
  - responsavel legal
  - consentimentos LGPD/termos
- Eu recomendaria nao misturar anamnese completa com esse primeiro onboarding. Melhor manter onboarding administrativo primeiro e anamnese clinica depois.
