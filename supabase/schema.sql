-- =========================================================
-- Block Drop (supabase_tetris) 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- =========================================================

-- 1) 프로필 (공개 아이디)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null
    check (username ~ '^[A-Za-z0-9_가-힣]{3,12}$'),
  created_at timestamptz not null default now()
);
-- 대소문자를 구분하지 않는 중복 방지
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- 가입 시 프로필 자동 생성 (signUp 의 options.data.username 사용)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 점수
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 99999999),
  level integer not null check (level >= 1),
  lines integer not null check (lines >= 0),
  created_at timestamptz not null default now()
);
create index scores_user_score_idx on public.scores (user_id, score desc);
create index scores_score_idx on public.scores (score desc);

-- 3) 피드백
create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
create index feedback_user_created_idx on public.feedback (user_id, created_at desc);

-- 4) 리더보드 뷰 (사용자별 최고 점수, 동점이면 먼저 달성한 기록)
create view public.leaderboard
with (security_invoker = true) as
select distinct on (s.user_id)
  s.user_id, p.username, s.score, s.level, s.lines, s.created_at
from public.scores s
join public.profiles p on p.id = s.user_id
order by s.user_id, s.score desc, s.created_at asc;

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.scores   enable row level security;
alter table public.feedback enable row level security;

-- profiles: 아이디는 누구나 조회 (중복 확인, 리더보드 표시). 생성은 트리거만 함.
create policy "profiles_select" on public.profiles
  for select to anon, authenticated using (true);

-- scores: 누구나 조회, 본인 계정으로만 추가. 수정/삭제 불가.
create policy "scores_select" on public.scores
  for select to anon, authenticated using (true);
create policy "scores_insert_own" on public.scores
  for insert to authenticated with check (user_id = (select auth.uid()));

-- feedback: 누구나 조회, 본인 계정으로만 추가(30초 쿨다운), 본인 것만 삭제.
create policy "feedback_select" on public.feedback
  for select to anon, authenticated using (true);
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.feedback f
      where f.user_id = (select auth.uid())
        and f.created_at > now() - interval '30 seconds'
    )
  );
create policy "feedback_delete_own" on public.feedback
  for delete to authenticated using (user_id = (select auth.uid()));
