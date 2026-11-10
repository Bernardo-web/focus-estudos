-- Teste de isolamento entre usuários e do fluxo de convite.
-- Rode num PostgreSQL comum: supabase_stub.sql, a migração e depois este arquivo.
\set ON_ERROR_STOP 1
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', '{"full_name":"Admin"}');
do $$ begin
  begin
    insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000bb', '{}');
    raise exception 'FALHOU: cadastro sem convite passou';
  exception when sqlstate 'P0001' then null; end;
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.create_invite(1, 14, 'amigo') as code \gset
insert into public.exams (name, role, board, exam_date) values ('PMAL', 'Soldado', 'Cebraspe', '2027-01-17') returning id as exam_a \gset
insert into public.subjects (exam_id, name) values (:'exam_a', 'Português') returning id as subj_a \gset
insert into public.week_slots (exam_id, weekday, kind, subject_id, minutes) values (:'exam_a', 1, 'subject', :'subj_a', 90) returning id as slot_a \gset
insert into public.slot_checks (slot_id, day) values (:'slot_a', '2026-11-09');
select public.set_primary_exam(:'exam_a');
reset role;

insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000bb', jsonb_build_object('invite_code', lower(:'code')));
do $$ begin
  begin
    insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000cc', jsonb_build_object('invite_code', (select code from public.invites limit 1)));
    raise exception 'FALHOU: convite de 1 uso aceitou 2 cadastros';
  exception when sqlstate 'P0001' then null; end;
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';
do $$ begin
  if (select count(*) from public.exams) <> 0 then raise exception 'FALHOU: B vê concurso de A'; end if;
  if (select count(*) from public.slot_checks) <> 0 then raise exception 'FALHOU: B vê checks de A'; end if;
  if (select is_admin from public.profiles) then raise exception 'FALHOU: B virou admin'; end if;
end $$;
insert into public.exams (name) values ('PRF') returning id as exam_b \gset
do $$ begin
  begin
    insert into public.subjects (exam_id, name, user_id)
      values ((select id from public.exams limit 1), 'x', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FALHOU: B gravou linha em nome de A';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
do $$ begin
  begin
    perform 1; 
    insert into public.week_slots (exam_id, weekday, kind, subject_id)
      select e.id, 1, 'subject', s.id from public.exams e, (select '00000000-0000-0000-0000-000000000001'::uuid id) s;
    raise exception 'FALHOU: slot com matéria inexistente/de outro';
  exception when foreign_key_violation then null;
  end;
end $$;
select public.set_primary_exam(:'exam_b');
reset role;
do $$ begin
  if (select count(*) from public.exams where is_primary) <> 2 then raise exception 'FALHOU: principal por usuário'; end if;
end $$;
select 'RLS OK' as resultado;
