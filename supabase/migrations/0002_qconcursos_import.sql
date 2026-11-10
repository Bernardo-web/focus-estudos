-- =============================================================================
-- Focus — importação de questões do Qconcursos
-- Rode no Supabase (SQL Editor > New query > colar > Run), uma vez, depois do 0001.
-- =============================================================================

-- Cada importação cobre um período (o filtro de datas usado no Qconcursos).
create table public.question_imports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  exam_id       uuid not null,
  source        text not null default 'qconcursos' check (source in ('qconcursos')),
  period_start  date not null,
  period_end    date not null,
  total         int not null default 0 check (total >= 0),
  created_at    timestamptz not null default now(),
  unique (id, user_id),
  check (period_start <= period_end),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);
create index question_imports_exam_idx on public.question_imports (exam_id, period_start);

-- As sessões criadas por uma importação somem junto se a importação for apagada.
alter table public.study_sessions add column import_id uuid;
alter table public.study_sessions
  add constraint study_sessions_import_fk foreign key (import_id, user_id)
  references public.question_imports (id, user_id) on delete cascade;

-- "Português" no Qconcursos = "Língua Portuguesa" no Focus: o app lembra a escolha.
create table public.subject_aliases (
  user_id     uuid not null default auth.uid(),
  alias       text not null check (char_length(alias) between 1 and 200),
  subject_id  uuid not null,
  primary key (user_id, alias),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

alter table public.question_imports enable row level security;
alter table public.subject_aliases  enable row level security;
create policy "dono: acesso total" on public.question_imports for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono: acesso total" on public.subject_aliases for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.question_imports, public.subject_aliases from anon;
