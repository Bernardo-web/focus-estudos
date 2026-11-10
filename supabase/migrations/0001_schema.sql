-- =============================================================================
-- Focus — schema inicial
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > colar > Run.
--
-- Princípios (os mesmos do Flowly):
--   * Todo dado pertence a um usuário (user_id) e o próprio banco garante, via
--     Row Level Security, que cada pessoa só lê e altera as próprias linhas.
--   * Chaves estrangeiras compostas (id, user_id) impedem ligar uma matéria ao
--     concurso de OUTRA pessoa, mesmo que alguém tente pela API.
--   * Cadastro só por convite, validado dentro do banco.
--   * Dias da semana seguem o JavaScript: 0 = domingo ... 6 = sábado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfis e convites
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.invites (
  code        text primary key default upper(left(replace(gen_random_uuid()::text, '-', ''), 10)),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  max_uses    int  not null default 1 check (max_uses between 1 and 50),
  uses        int  not null default 0 check (uses >= 0),
  expires_at  timestamptz not null default now() + interval '14 days',
  note        text check (char_length(note) <= 120),
  created_at  timestamptz not null default now()
);

create table public.invite_redemptions (
  invite_code text not null references public.invites (code) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_code, user_id)
);

-- -----------------------------------------------------------------------------
-- Concursos
-- -----------------------------------------------------------------------------
create table public.exams (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  org_key                text check (char_length(org_key) <= 40),        -- órgão do catálogo (ex.: 'pmal', 'prf')
  name                   text not null check (char_length(name) between 1 and 80),   -- ex.: "PMAL"
  role                   text check (char_length(role) <= 80),            -- cargo, ex.: "Soldado"
  board                  text check (char_length(board) <= 60),           -- banca, ex.: "Cebraspe"
  exam_date              date,
  scoring                text not null default 'cebraspe' check (scoring in ('cebraspe', 'tradicional')),
  color                  text not null default '#1e3a8a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  crest_path             text check (char_length(crest_path) <= 300),     -- imagem do brasão no Storage
  status                 text not null default 'active' check (status in ('active', 'archived')),
  is_primary             boolean not null default false,
  goal_weekly_minutes    int not null default 1080 check (goal_weekly_minutes between 0 and 10080),
  goal_weekly_questions  int not null default 150  check (goal_weekly_questions between 0 and 10000),
  goal_accuracy          smallint not null default 75 check (goal_accuracy between 0 and 100),
  notes                  text check (char_length(notes) <= 2000),
  created_at             timestamptz not null default now(),
  unique (id, user_id)
);
create unique index exams_one_primary on public.exams (user_id) where is_primary;

-- -----------------------------------------------------------------------------
-- Edital: matérias e tópicos
-- -----------------------------------------------------------------------------
create table public.subjects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  exam_id         uuid not null,
  name            text not null check (char_length(name) between 1 and 80),
  short_name      text check (char_length(short_name) <= 24),
  weight          numeric(4,1) not null default 1 check (weight between 0 and 99),
  question_count  smallint check (question_count between 0 and 999),
  color           text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position        smallint not null default 0,
  created_at      timestamptz not null default now(),
  unique (id, user_id),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  subject_id  uuid not null,
  name        text not null check (char_length(name) between 1 and 200),
  status      text not null default 'pending' check (status in ('pending', 'seen', 'reviewed', 'mastered')),
  position    smallint not null default 0,
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Cronograma: modelo de semana e checklist de cada dia
-- -----------------------------------------------------------------------------
create table public.week_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  exam_id     uuid not null,
  weekday     smallint not null check (weekday between 0 and 6),
  position    smallint not null default 0,
  kind        text not null check (kind in (
                'subject', 'questions', 'review', 'week_review',
                'mock', 'error_analysis', 'essay', 'log', 'custom')),
  subject_id  uuid,
  label       text check (char_length(label) <= 80),
  minutes     smallint check (minutes between 0 and 720),
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  check (kind <> 'subject' or subject_id is not null),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create table public.slot_checks (
  user_id     uuid not null,
  slot_id     uuid not null,
  day         date not null,
  checked_at  timestamptz not null default now(),
  primary key (slot_id, day),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (slot_id, user_id) references public.week_slots (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Sessões de estudo, revisões programadas e simulados
-- -----------------------------------------------------------------------------
create table public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  exam_id     uuid not null,
  subject_id  uuid,
  topic_id    uuid,
  day         date not null default current_date,
  minutes     smallint not null default 0 check (minutes between 0 and 1440),
  questions   smallint not null default 0 check (questions between 0 and 2000),
  correct     smallint not null default 0 check (correct >= 0),
  wrong       smallint not null default 0 check (wrong >= 0),
  notes       text check (char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  check (correct + wrong <= questions),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete set null (subject_id),
  foreign key (topic_id, user_id) references public.topics (id, user_id) on delete set null (topic_id)
);
create index study_sessions_user_day_idx on public.study_sessions (user_id, day desc);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  session_id  uuid,
  subject_id  uuid not null,
  topic_id    uuid,
  stage       smallint not null check (stage in (1, 7, 30)),   -- revisão de 24h, 7 dias, 30 dias
  due_on      date not null,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (session_id, user_id) references public.study_sessions (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  foreign key (topic_id, user_id) references public.topics (id, user_id) on delete set null (topic_id)
);
create index reviews_user_due_idx on public.reviews (user_id, due_on) where done_at is null;

create table public.mocks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  exam_id       uuid not null,
  title         text not null check (char_length(title) between 1 and 120),
  scheduled_on  date not null,
  done          boolean not null default false,
  total_items   smallint check (total_items between 1 and 500),
  correct       smallint check (correct >= 0),
  wrong         smallint check (wrong >= 0),
  essay_score   numeric(5,2) check (essay_score >= 0),
  essay_max     numeric(5,2) check (essay_max > 0),
  notes         text check (char_length(notes) <= 2000),
  created_at    timestamptz not null default now(),
  unique (id, user_id),
  check (coalesce(correct, 0) + coalesce(wrong, 0) <= coalesce(total_items, 32767)),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (exam_id, user_id) references public.exams (id, user_id) on delete cascade
);
create index mocks_user_date_idx on public.mocks (user_id, scheduled_on desc);

create table public.mock_results (
  mock_id     uuid not null,
  subject_id  uuid not null,
  user_id     uuid not null,
  items       smallint not null check (items between 1 and 500),
  correct     smallint not null default 0 check (correct >= 0),
  wrong       smallint not null default 0 check (wrong >= 0),
  primary key (mock_id, subject_id),
  check (correct + wrong <= items),
  foreign key (user_id) references public.profiles (id) on delete cascade,
  foreign key (mock_id, user_id) references public.mocks (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- Novo usuário: valida convite e cria perfil.
-- O primeiro usuário do sistema não precisa de convite e vira administrador.
-- -----------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_code  text := nullif(upper(trim(new.raw_user_meta_data ->> 'invite_code')), '');
  v_first boolean;
  v_inv   public.invites;
begin
  lock table public.profiles in share row exclusive mode;
  select not exists (select 1 from public.profiles) into v_first;

  if not v_first then
    if v_code is null then
      raise exception 'Cadastro somente por convite.' using errcode = 'P0001';
    end if;
    select * into v_inv from public.invites where code = v_code for update;
    if not found or v_inv.expires_at < now() or v_inv.uses >= v_inv.max_uses then
      raise exception 'Convite inválido ou expirado.' using errcode = 'P0001';
    end if;
    update public.invites set uses = uses + 1 where code = v_code;
  end if;

  insert into public.profiles (id, full_name, is_admin)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''), v_first);

  if not v_first then
    insert into public.invite_redemptions (invite_code, user_id) values (v_code, new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.check_invite(p_code text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.invites
    where code = upper(trim(p_code)) and expires_at > now() and uses < max_uses
  );
$$;

create function public.create_invite(p_max_uses int default 1, p_days int default 14, p_note text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Apenas administradores podem criar convites.' using errcode = '42501';
  end if;
  insert into public.invites (created_by, max_uses, expires_at, note)
  values (auth.uid(), greatest(1, least(p_max_uses, 50)),
          now() + make_interval(days => greatest(1, least(p_days, 90))), p_note)
  returning code into v_code;
  return v_code;
end $$;

-- Define o concurso principal (o que aparece na tela Hoje) de forma atômica.
create function public.set_primary_exam(p_exam uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.exams set is_primary = false where user_id = auth.uid() and is_primary and id <> p_exam;
  update public.exams set is_primary = true  where user_id = auth.uid() and id = p_exam;
end $$;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  delete from storage.objects where bucket_id = 'crests' and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_invite(int, int, text) from public, anon;
revoke all on function public.set_primary_exam(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function public.create_invite(int, int, text) to authenticated;
grant execute on function public.set_primary_exam(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.invites            enable row level security;
alter table public.invite_redemptions enable row level security;

create policy "perfil: ler o próprio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "convites: admin vê os seus" on public.invites
  for select to authenticated using (created_by = (select auth.uid()));
create policy "convites: admin apaga os seus" on public.invites
  for delete to authenticated using (created_by = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'exams', 'subjects', 'topics', 'week_slots', 'slot_checks',
    'study_sessions', 'reviews', 'mocks', 'mock_results'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono: acesso total" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;

-- -----------------------------------------------------------------------------
-- Storage: imagens dos brasões. Cada pessoa guarda as suas em <user_id>/...
-- Bucket privado: as imagens são exibidas por links assinados, só para o dono.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crests', 'crests', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "brasões: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'crests' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brasões: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'crests' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brasões: dono troca" on storage.objects for update to authenticated
  using (bucket_id = 'crests' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brasões: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'crests' and (storage.foldername(name))[1] = (select auth.uid())::text);
