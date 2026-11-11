-- =============================================================================
-- Focus — caderno de erros, TAF, redação, meta de nota e lembretes
-- Rode no Supabase (SQL Editor > New query > colar > Run), uma vez, depois do 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Meta de nota (nota de corte esperada) no concurso
-- -----------------------------------------------------------------------------
alter table public.exams
  add column target_score numeric(6,2) check (target_score >= 0),
  add column total_items  smallint check (total_items between 1 and 1000);

-- PMAL (Cebraspe): 120 itens certo/errado
update public.exams set total_items = 120 where org_key = 'pmal' and total_items is null;

-- -----------------------------------------------------------------------------
-- Caderno de erros (vira flashcard no Anki)
-- -----------------------------------------------------------------------------
create table public.error_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  exam_id      uuid not null,
  subject_id   uuid,
  topic_id     uuid,
  statement    text not null check (char_length(statement) between 1 and 3000),  -- enunciado / assertiva
  answer       text not null check (char_length(answer) between 1 and 1500),     -- gabarito e explicação
  reason       text not null default 'conteudo'
               check (reason in ('conteudo', 'interpretacao', 'pegadinha', 'desatencao', 'chute', 'outro')),
  bizu         text check (char_length(bizu) <= 1500),
  source       text check (char_length(source) <= 120),                          -- ex.: "Qconcursos Q3456789"
  exported_at  timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id),
  foreign key (topic_id, user_id) references public.topics (id, user_id) on delete set null (topic_id)
);
create index error_notes_exam_idx on public.error_notes (exam_id, created_at desc);

-- -----------------------------------------------------------------------------
-- TAF: provas do edital e marcas dos treinos
-- unit: reps (repetições), seconds (tempo em segundos), meters (distância)
-- -----------------------------------------------------------------------------
create table public.fitness_tests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid(),
  exam_id           uuid not null,
  name              text not null check (char_length(name) between 1 and 80),
  detail            text check (char_length(detail) <= 120),
  unit              text not null check (unit in ('reps', 'seconds', 'meters')),
  target            numeric(8,2) not null check (target >= 0),
  higher_is_better  boolean not null default true,
  position          smallint not null default 0,
  created_at        timestamptz not null default now(),
  unique (id, user_id),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);

create table public.fitness_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  test_id     uuid not null,
  day         date not null default current_date,
  value       numeric(8,2) not null check (value >= 0),
  notes       text check (char_length(notes) <= 300),
  created_at  timestamptz not null default now(),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (test_id, user_id) references public.fitness_tests (id, user_id) on delete cascade
);
create index fitness_logs_test_idx on public.fitness_logs (test_id, day);

-- -----------------------------------------------------------------------------
-- Redações
-- -----------------------------------------------------------------------------
create table public.essays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  exam_id     uuid not null,
  day         date not null default current_date,
  theme       text not null check (char_length(theme) between 1 and 200),
  score       numeric(5,2) check (score >= 0),
  max_score   numeric(5,2) check (max_score > 0),
  issues      text[] not null default '{}' check (cardinality(issues) <= 20),
  notes       text check (char_length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  check (score is null or max_score is null or score <= max_score),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);
create index essays_exam_idx on public.essays (exam_id, day desc);

-- -----------------------------------------------------------------------------
-- Lembretes (notificações no celular)
-- -----------------------------------------------------------------------------
create table public.reminder_settings (
  user_id       uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  enabled       boolean not null default true,
  hour          smallint not null default 19 check (hour between 0 and 23),   -- horário de Brasília/Alagoas
  last_sent_on  date,
  updated_at    timestamptz not null default now()
);

create table public.push_subscriptions (
  endpoint    text not null check (char_length(endpoint) <= 1000),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  created_at  timestamptz not null default now(),
  primary key (endpoint, user_id)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['error_notes', 'fitness_tests', 'fitness_logs', 'essays', 'reminder_settings', 'push_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono: acesso total" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
