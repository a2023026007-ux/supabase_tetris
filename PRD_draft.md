# PRD: 웹 기반 블록 퍼즐 게임 (Supabase Tetris)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.1 |
| 작성일 | 2026-11-09 |
| 저장소 | https://github.com/a2023026007-ux/supabase_tetris.git |
| 배포 | Vercel |
| 백엔드 | Supabase (PostgreSQL + Auth + REST API) |

### 변경 이력
| 버전 | 내용 |
|---|---|
| v1.0 | 최초 작성 (닉네임 입력 방식) |
| v1.1 | 이메일 회원가입과 고유 아이디로 사용자를 식별하도록 변경. 플레이는 누구나 가능하고, 점수 저장과 피드백 작성은 로그인해야 가능. 리더보드는 사용자별 최고 점수 기준으로 변경. |

---

## 1. 개요

브라우저에서 바로 플레이할 수 있는 테트리스 방식의 낙하 블록 퍼즐 게임을 만든다. 사용자는 이메일로 가입하고 고유한 아이디를 정한다. 로그인한 사용자의 점수는 계정에 연결되어 Supabase에 저장되고, 사용자별 최고 점수로 리더보드를 만든다. 로그인한 사용자는 게임에 대한 피드백도 남길 수 있다. 배경음악(BGM)과 효과음(SFX)을 넣고, 고스트 피스(착지 위치를 보여주는 그림자)는 넣지 않는다.

### 1.1 목표
- 누구나 URL만 열면 로그인 없이 바로 플레이할 수 있다.
- 이메일 계정과 고유 아이디로 사용자를 식별해서, 점수와 피드백의 주인을 확실히 한다.
- 점수를 영구 저장하고 사용자별 최고 점수 랭킹을 보여준다.
- 사용자 피드백을 모아 다음 개선에 활용한다.
- GitHub에 push하면 Vercel이 자동으로 배포한다.

### 1.2 범위에서 제외 (Non-Goals)
- 고스트 피스(그림자) 표시
- 소셜 로그인(Google, GitHub 등). v1은 이메일 가입만 지원한다.
- 실시간 멀티플레이 대전
- 네이티브 모바일 앱

---

## 2. 대상 사용자
- 가볍게 퍼즐 게임을 즐기려는 웹 사용자 (로그인 없이 플레이)
- 점수를 기록하고 경쟁하려는 사용자 (가입 후 리더보드 참여)
- 게임 개선 의견을 남기고 싶은 사용자

### 2.1 사용자 상태별 권한

| 기능 | 비로그인 | 로그인 |
|---|---|---|
| 게임 플레이 | O | O |
| 리더보드 보기 | O | O |
| 피드백 목록 보기 | O | O |
| 점수 저장 | X (로그인 안내) | O |
| 피드백 작성 | X (로그인 안내) | O |
| 내 기록 보기 | X | O |

---

## 3. 기능 요구사항

우선순위: **P0** = 필수(MVP), **P1** = 권장, **P2** = 선택

### 3.1 회원 및 인증 (P0)

| ID | 요구사항 |
|---|---|
| U-01 | Supabase Auth로 이메일과 비밀번호로 가입한다. |
| U-02 | 가입할 때 **아이디**를 함께 입력한다. 아이디는 3~12자이고 영문, 숫자, 한글, 밑줄(_)만 쓸 수 있으며, 대소문자를 구분하지 않고 중복될 수 없다. |
| U-03 | 아이디 입력 칸에서 중복 여부를 바로 확인해 보여준다. 동시에 같은 아이디로 가입하는 경우는 DB의 UNIQUE 제약으로 막는다. |
| U-04 | 비밀번호는 최소 8자로 한다. |
| U-05 | 가입하면 인증 메일을 보내고, 메일의 링크를 눌러야 로그인할 수 있다. 인증 후에는 배포된 사이트로 돌아온다. |
| U-06 | 이메일과 비밀번호로 로그인한다. 로그인 상태는 새로고침해도 유지된다(supabase-js 세션). |
| U-07 | 로그아웃할 수 있다. |
| U-08 | 비밀번호를 잊었을 때 재설정 메일을 받아 새 비밀번호를 정할 수 있다. |
| U-09 | 로그인하면 화면 위쪽에 아이디를 표시한다. |
| U-10 | 화면에서 다른 사용자를 가리킬 때는 이메일이 아니라 아이디만 보여준다. |
| U-11 | 내 기록 화면에서 내 최고 점수, 최근 기록 10개, 전체 순위를 보여준다 — **P1** |
| U-12 | 아이디 변경, 회원 탈퇴 — **P2** |

### 3.2 게임 플레이 (P0)

| ID | 요구사항 |
|---|---|
| G-01 | 10열 × 20행 보드를 쓴다. |
| G-02 | 7종 테트로미노(I, O, T, S, Z, J, L)를 쓰고, 종류마다 색이 다르다. |
| G-03 | 7-bag 랜덤 방식으로 블록을 생성한다. 7개 블록을 한 묶음으로 섞어서 같은 블록이 지나치게 몰리지 않게 한다. |
| G-04 | 이동(좌/우), 소프트 드롭, 하드 드롭, 회전(시계/반시계)을 지원한다. |
| G-05 | 벽이나 다른 블록에 막혀 회전할 수 없을 때 위치를 조금 옮겨 회전을 허용한다(기본 Wall Kick). |
| G-06 | 가로줄이 꽉 차면 지우고 위의 블록을 내린다. |
| G-07 | 다음 블록 미리보기를 표시한다(최소 1개, 권장 3개). |
| G-08 | 새 블록이 놓일 자리가 막히면 게임 오버 처리한다. |
| G-09 | 일시정지/재개 기능을 제공한다(P 또는 ESC 키). |
| G-10 | **고스트 피스(그림자)는 표시하지 않는다.** |
| G-11 | 홀드 기능을 제공한다(C 키, 블록 하나당 한 번만) — **P1** |

### 3.3 점수 및 레벨 (P0)

| 동작 | 점수 |
|---|---|
| 1줄 삭제 | 100 × 레벨 |
| 2줄 삭제 | 300 × 레벨 |
| 3줄 삭제 | 500 × 레벨 |
| 4줄 동시 삭제 | 800 × 레벨 |
| 소프트 드롭 | 1칸당 1점 |
| 하드 드롭 | 1칸당 2점 |

- 10줄을 지울 때마다 레벨이 1 오른다(시작 레벨 1).
- 레벨이 오를수록 블록이 빨리 떨어진다. 예: 레벨 1은 1000ms, 이후 레벨마다 약 15%씩 빨라지고 최소 100ms까지.
- 화면에는 점수, 레벨, 지운 줄 수를 항상 표시한다.

### 3.4 조작 (P0)

| 키 | 동작 |
|---|---|
| ← / → | 좌우 이동 (누르고 있으면 반복 이동: 첫 지연 약 170ms, 이후 약 50ms 간격) |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 방향 회전 |
| Z | 반시계 방향 회전 |
| C | 홀드 (P1) |
| P / ESC | 일시정지 |
| M | 음소거 켜기/끄기 |

- 로그인, 피드백 같은 입력창에 커서가 있을 때는 게임 키 입력을 무시한다.
- 모바일 터치 조작(화면 버튼 또는 스와이프) — **P1**

### 3.5 점수 저장 및 리더보드 (P0)

| ID | 요구사항 |
|---|---|
| S-01 | 게임 오버 시 최종 점수, 레벨, 지운 줄 수를 보여주는 결과 모달을 띄운다. |
| S-02 | **로그인한 경우** 게임이 끝나면 점수를 내 계정(user_id)으로 `scores` 테이블에 자동 저장하고 "저장 완료"를 표시한다. |
| S-03 | **로그인하지 않은 경우** "로그인하면 점수를 저장할 수 있습니다"와 함께 로그인/가입 버튼을 보여준다. 결과 모달을 닫지 않은 채로 로그인하면 방금 끝난 게임의 점수를 저장한다. 결과 모달을 닫거나 새 게임을 시작하면 그 점수는 버린다. |
| S-04 | 리더보드는 **사용자별 최고 점수** 기준 상위 10명(순위, 아이디, 점수, 레벨, 달성 날짜)을 보여준다. |
| S-05 | 로그인한 사용자가 순위 안에 있으면 그 행을 강조한다. 순위 밖이면 표 아래에 내 순위와 최고 점수를 따로 보여준다(P1). |
| S-06 | 네트워크 오류로 저장에 실패하면 오류 메시지와 "다시 시도" 버튼을 보여준다. |
| S-07 | 같은 게임 결과가 두 번 저장되지 않게 한다(게임마다 한 번만 저장 요청). |
| S-08 | 기간별 리더보드(오늘/전체) — **P2** |

### 3.6 사용자 피드백 (P0)

| ID | 요구사항 |
|---|---|
| F-01 | 메인 화면 또는 메뉴에서 "피드백" 버튼으로 피드백 화면을 연다. |
| F-02 | 피드백 목록(최신순 20개, 아이디·별점·내용·날짜)은 누구나 볼 수 있다. |
| F-03 | 피드백 작성은 **로그인한 사용자만** 할 수 있다. 로그인하지 않았으면 작성 폼 대신 로그인 안내를 보여준다. |
| F-04 | 입력 항목: 별점(1~5, 필수), 내용(1~500자, 필수). 작성자는 로그인한 계정으로 자동 기록한다. |
| F-05 | 제출하면 `feedback` 테이블에 저장하고, 목록 맨 위에 바로 보여준다. |
| F-06 | 내가 쓴 피드백은 삭제할 수 있다 — **P1** |
| F-07 | 내용은 HTML로 해석하지 않고 텍스트로만 출력한다(XSS 방지). |
| F-08 | 한 사용자가 너무 자주 제출하지 못하게 한다(같은 계정 기준 30초 쿨다운, 클라이언트 + DB 검사). |

### 3.7 사운드 (P0)

| ID | 요구사항 |
|---|---|
| A-01 | 게임 중 배경음악을 반복 재생한다. 일시정지하면 BGM도 멈춘다. |
| A-02 | 효과음: 이동, 회전, 하드 드롭/착지, 줄 삭제(1~3줄), 4줄 삭제(별도 효과음), 레벨 업, 게임 오버. |
| A-03 | BGM과 효과음 볼륨을 따로 조절하거나 켜고 끌 수 있다. 설정은 localStorage에 저장한다. |
| A-04 | 브라우저 자동재생 정책 때문에, 사용자가 처음 클릭하거나 키를 누른 뒤("게임 시작" 버튼)부터 오디오를 재생한다. |
| A-05 | 저작권 문제가 없는 음원만 쓴다(직접 만든 곡, CC0, 로열티 프리). 기존 상용 게임의 음악은 쓰지 않는다. |
| A-06 | 효과음은 Web Audio API로 직접 합성하거나 작은 오디오 파일(mp3/ogg)로 넣는다. 파일 크기는 합쳐서 약 2MB 이하로 유지한다. |

### 3.8 화면 구성 (P0)

1. **상단 바**: 게임 제목. 로그인했으면 아이디와 "내 기록"(P1), "로그아웃" 버튼을, 로그인하지 않았으면 "로그인", "회원가입" 버튼을 보여준다.
2. **시작 화면**: "게임 시작", "리더보드", "피드백", 사운드 설정
3. **게임 화면**: 보드(가운데), 다음 블록/홀드(옆), 점수·레벨·줄 수 패널, 일시정지·음소거 버튼
4. **게임 오버 모달**: 결과, 저장 상태(저장 완료 / 로그인 안내), 다시 하기
5. **로그인 모달**: 이메일, 비밀번호, "비밀번호 찾기", "회원가입으로 이동"
6. **회원가입 모달**: 아이디(중복 확인 표시), 이메일, 비밀번호, 비밀번호 확인. 가입이 끝나면 "인증 메일을 확인하세요" 안내
7. **비밀번호 재설정 화면**: 재설정 메일의 링크로 들어와 새 비밀번호를 입력한다
8. **리더보드 패널/모달**: 사용자별 최고 점수 상위 10명
9. **피드백 모달**: 작성 폼(로그인 시)과 최근 피드백 목록

- 반응형: 데스크톱 기본, 모바일 화면에서도 보드가 잘리지 않게 한다(P1에서 터치 조작 추가).
- 게임 렌더링은 HTML5 Canvas를 쓴다.
- 게임 중에 로그인/가입 모달을 열면 게임을 자동으로 일시정지한다.

---

## 4. 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 60fps(requestAnimationFrame 기반 게임 루프), 첫 로딩 3초 이내 |
| 호환성 | 최신 Chrome, Edge, Firefox, Safari |
| 보안 | Supabase anon key만 클라이언트에 넣고, service_role key는 절대 넣지 않는다. 모든 테이블에 RLS를 켠다. 쓰기는 `auth.uid()`와 일치하는 본인 데이터로만 허용한다. |
| 개인정보 | 이메일은 Supabase Auth(`auth.users`)에만 저장하고, 공개 테이블에는 넣지 않는다. 다른 사용자에게는 아이디만 보여준다. |
| 데이터 검증 | 클라이언트와 DB(CHECK 제약) 양쪽에서 입력값 길이, 형식, 범위를 검증한다. |
| 접근성 | 키보드만으로 모든 메뉴와 폼을 쓸 수 있다. 색 외에 모양으로도 블록을 구분할 수 있다(블록 테두리). |
| 저작권 | 기존 상용 게임의 이름, 로고, 그래픽, 음악을 쓰지 않는다(아래 9절 참고). |

---

## 5. 기술 스택 및 아키텍처

| 계층 | 선택 | 이유 |
|---|---|---|
| 프론트엔드 | Vite + Vanilla TypeScript + Canvas | 가볍고 빌드가 빠르며 Vercel에서 정적 배포가 쉽다 |
| 스타일 | 일반 CSS | 의존성을 최소화한다 |
| 인증 | Supabase Auth (이메일/비밀번호) | 가입, 메일 인증, 비밀번호 재설정을 기본으로 제공한다 |
| 데이터 | `@supabase/supabase-js` v2 | 브라우저에서 바로 DB를 호출한다(RLS로 보호) |
| 오디오 | Web Audio API (+ HTMLAudioElement로 BGM) | 효과음 지연이 적다 |
| 호스팅 | Vercel (정적 사이트) | GitHub와 연동해 자동 배포 |

```
[브라우저: Vite 빌드 결과물 (Vercel CDN)]
        │  supabase-js (anon key + 로그인 세션 JWT, HTTPS)
        ▼
[Supabase]
   ├─ Auth: auth.users (이메일, 비밀번호)
   └─ PostgreSQL + RLS
        ├─ profiles   (아이디)
        ├─ scores     (user_id → profiles)
        ├─ feedback   (user_id → profiles)
        └─ leaderboard (뷰: 사용자별 최고 점수)
```

### 5.1 권장 폴더 구조
```
supabase_tetris/
├─ index.html
├─ public/
│  └─ audio/            # bgm.mp3, sfx 파일
├─ src/
│  ├─ main.ts           # 진입점, 화면 전환
│  ├─ game/
│  │  ├─ board.ts       # 보드 상태, 충돌, 줄 삭제
│  │  ├─ pieces.ts      # 테트로미노 정의, 7-bag
│  │  ├─ rotation.ts    # 회전, Wall Kick
│  │  ├─ game.ts        # 게임 루프, 점수, 레벨
│  │  └─ input.ts       # 키보드/터치 입력
│  ├─ render/renderer.ts
│  ├─ audio/sound.ts
│  ├─ api/
│  │  ├─ supabase.ts    # 클라이언트 생성
│  │  ├─ auth.ts        # 가입, 로그인, 로그아웃, 재설정, 세션 상태
│  │  ├─ profiles.ts    # 아이디 중복 확인, 내 프로필
│  │  ├─ scores.ts
│  │  └─ feedback.ts
│  ├─ ui/               # 모달, 상단 바, 리더보드, 피드백, 인증 폼
│  └─ styles.css
├─ supabase/
│  └─ schema.sql        # 테이블, 트리거, 뷰, RLS 정의
├─ .env.example
├─ PRD.md
└─ package.json
```

---

## 6. 데이터베이스 설계 (Supabase)

### 6.1 `profiles` 테이블 (공개 프로필)
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | uuid | PK, `auth.users(id)` 참조, 계정 삭제 시 함께 삭제 |
| username | text | NOT NULL, 3~12자, 영문/숫자/한글/_ , 대소문자 무시 UNIQUE |
| created_at | timestamptz | DEFAULT now() |

- 가입할 때 `signUp`의 `options.data.username`으로 아이디를 넘기면, `auth.users`에 행이 생길 때 트리거가 `profiles` 행을 자동으로 만든다.
- 아이디가 중복이거나 형식에 맞지 않으면 트리거가 실패하고 가입도 함께 실패한다. 클라이언트는 이 오류를 "이미 사용 중인 아이디입니다"로 보여준다.

### 6.2 `scores` 테이블
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigint (identity) | PK |
| user_id | uuid | NOT NULL, `profiles(id)` 참조, DEFAULT `auth.uid()` |
| score | integer | NOT NULL, 0 ~ 99,999,999 |
| level | integer | NOT NULL, 1 이상 |
| lines | integer | NOT NULL, 0 이상 |
| created_at | timestamptz | DEFAULT now() |

### 6.3 `feedback` 테이블
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | bigint (identity) | PK |
| user_id | uuid | NOT NULL, `profiles(id)` 참조, DEFAULT `auth.uid()` |
| rating | smallint | NOT NULL, 1~5 |
| content | text | NOT NULL, 1~500자 |
| created_at | timestamptz | DEFAULT now() |

### 6.4 `leaderboard` 뷰
- 사용자마다 최고 점수 1건만 남긴다. 점수가 같으면 먼저 달성한 기록을 남긴다.
- 아이디(username)를 함께 보여준다.

### 6.5 SQL (supabase/schema.sql)
```sql
-- 1) 프로필
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null
    check (username ~ '^[A-Za-z0-9_가-힣]{3,12}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- 가입 시 프로필 자동 생성
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

-- 3) 피드백
create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

-- 4) 리더보드 뷰 (사용자별 최고 점수)
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

-- profiles: 아이디는 누구나 조회(중복 확인, 리더보드 표시용). 생성은 트리거만 함.
create policy "profiles_select" on public.profiles
  for select to anon, authenticated using (true);

-- scores: 누구나 조회, 본인 계정으로만 추가. 수정/삭제 불가.
create policy "scores_select" on public.scores
  for select to anon, authenticated using (true);
create policy "scores_insert_own" on public.scores
  for insert to authenticated with check (user_id = (select auth.uid()));

-- feedback: 누구나 조회, 본인 계정으로만 추가, 본인 것만 삭제(P1). 30초 쿨다운.
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
```

### 6.6 주요 API 호출 (supabase-js)
| 기능 | 호출 |
|---|---|
| 회원가입 | `supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin } })` |
| 로그인 | `supabase.auth.signInWithPassword({ email, password })` |
| 로그아웃 | `supabase.auth.signOut()` |
| 비밀번호 재설정 메일 | `supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/?reset=1' })` |
| 새 비밀번호 저장 | `supabase.auth.updateUser({ password })` |
| 세션 변화 감지 | `supabase.auth.onAuthStateChange(...)` |
| 아이디 중복 확인 | `supabase.from('profiles').select('id').ilike('username', username).maybeSingle()` (`_`는 이스케이프) |
| 점수 저장 | `supabase.from('scores').insert({ score, level, lines })` (user_id는 DB 기본값) |
| 리더보드 | `supabase.from('leaderboard').select('*').order('score', { ascending: false }).order('created_at').limit(10)` |
| 피드백 목록 | `supabase.from('feedback').select('id, rating, content, created_at, user_id, profiles(username)').order('created_at', { ascending: false }).limit(20)` |
| 피드백 저장 | `supabase.from('feedback').insert({ rating, content })` |

---

## 7. 배포 (Vercel + GitHub + Supabase)

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행한다.
2. **Authentication → Providers → Email**이 켜져 있고 "Confirm email"이 켜져 있는지 확인한다.
3. **Authentication → URL Configuration**에서
   - Site URL: Vercel 배포 주소(예: `https://supabase-tetris.vercel.app`)
   - Redirect URLs: 배포 주소, `http://localhost:5173` (로컬 개발용)
4. Supabase 기본 메일 발송은 시간당 보낼 수 있는 양이 적다. 실제 사용자를 받을 때는 **Authentication → SMTP Settings**에 외부 SMTP(예: Resend)를 연결한다.
5. **Project Settings → API**에서 Project URL과 anon(public) key를 복사한다.
6. 코드를 GitHub 저장소 `a2023026007-ux/supabase_tetris`에 push한다.
7. Vercel에서 **Add New Project → Import**로 저장소를 연결한다.
   - Framework Preset: **Vite**
   - Build Command: `npm run build`, Output Directory: `dist`
8. Vercel **Environment Variables**에 다음을 등록한다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
9. 배포한 뒤에는 `main` 브랜치에 push할 때마다 자동으로 다시 배포된다. 배포 주소가 바뀌면 3번 설정도 함께 고친다.

- `.env`는 `.gitignore`에 넣고, `.env.example`에는 변수 이름만 적는다.

---

## 8. 성공 지표
- 가입 → 메일 인증 → 로그인 흐름이 끊김 없이 동작한다
- 로그인한 사용자의 게임 오버 후 점수 저장 성공률 99% 이상(네트워크 정상 기준)
- 리더보드 조회 응답 1초 이내
- 피드백 제출이 정상 동작하고 목록에 바로 반영된다
- 주요 브라우저 4종에서 플레이와 사운드가 정상 동작한다

---

## 9. 리스크 및 고려사항

| 리스크 | 내용 | 대응 |
|---|---|---|
| 점수 조작 | 로그인으로 누가 저장했는지는 알 수 있지만, 점수 값은 여전히 클라이언트가 보내므로 개발자 도구로 가짜 점수를 넣을 수 있다. | v1: DB CHECK 제약으로 범위만 제한하고, 조작된 기록은 계정 단위로 찾아 삭제할 수 있다. 이후: Supabase Edge Function에서 점수와 레벨/줄 수/플레이 시간의 관계를 검증한다. |
| 다중 계정 | 이메일을 여러 개 써서 계정을 여러 개 만들 수 있다. | 메일 인증을 필수로 해서 가입 비용을 높인다. 필요하면 가입 CAPTCHA(Supabase Auth의 hCaptcha/Turnstile)를 추가한다. |
| 인증 메일 발송 한도 | Supabase 기본 SMTP는 발송량이 적어 가입이 몰리면 메일이 가지 않는다. | 공개 전에 외부 SMTP를 연결한다(7절 4번). |
| 부적절한 아이디/내용 | 욕설 아이디나 피드백이 공개 목록에 노출될 수 있다. | 간단한 금칙어 필터(P1), Supabase 대시보드에서 직접 삭제하거나 계정을 정지한다. |
| 개인정보 | 이메일은 개인정보다. | 공개 테이블과 화면에는 이메일을 넣지 않고 아이디만 쓴다. 회원 탈퇴 기능(P2)을 넣으면 관련 데이터도 함께 삭제된다(ON DELETE CASCADE). |
| 상표/저작권 | "Tetris"는 등록 상표이고, 원작 음악과 그래픽은 저작권 보호 대상이다. | 공개 배포 시 서비스 이름은 독자적인 이름(예: "Block Drop")을 쓰고, 그래픽과 음원은 직접 만들거나 무료 라이선스 자료를 쓴다. 저장소 이름은 그대로 둬도 된다. |
| 오디오 자동재생 차단 | 브라우저가 사용자 동작 없이 재생되는 소리를 막는다. | "게임 시작" 클릭 시점에 AudioContext를 시작한다. |

---

## 10. 마일스톤

| 단계 | 내용 |
|---|---|
| M1 | 프로젝트 초기 설정(Vite + TS), GitHub 연결, Vercel 첫 배포 |
| M2 | 핵심 게임 로직: 보드, 블록, 이동/회전, 줄 삭제, 점수/레벨, 게임 오버 |
| M3 | UI: 시작 화면, 다음 블록, 점수 패널, 일시정지, 게임 오버 모달 |
| M4 | Supabase 스키마 적용, 회원가입/로그인/로그아웃/비밀번호 재설정, 상단 바 |
| M5 | 점수 자동 저장, 리더보드(사용자별 최고 점수) |
| M6 | 피드백 작성 및 목록 |
| M7 | BGM과 효과음, 사운드 설정 |
| M8 | 크로스 브라우저 테스트, 버그 수정, 외부 SMTP 연결, 최종 배포 |
| 이후 | P1/P2 기능(홀드, 모바일 터치, 내 기록, 피드백 삭제, 기간별 랭킹, 금칙어 필터, 아이디 변경, 회원 탈퇴) |

---

## 11. 인수 조건 (Acceptance Criteria)
- [ ] 배포 URL에 접속해 로그인 없이 게임을 시작하고 리더보드와 피드백 목록을 볼 수 있다.
- [ ] 아이디, 이메일, 비밀번호로 가입하면 인증 메일이 오고, 인증 후 로그인할 수 있다.
- [ ] 이미 있는 아이디(대소문자만 다른 경우 포함)로는 가입할 수 없다.
- [ ] 로그인 상태가 새로고침 후에도 유지되고, 로그아웃할 수 있다.
- [ ] 비밀번호 재설정 메일로 새 비밀번호를 정할 수 있다.
- [ ] 7종 블록이 나오고, 이동/회전/하드 드롭/줄 삭제가 규칙대로 동작한다.
- [ ] 고스트 피스(그림자)가 표시되지 않는다.
- [ ] 레벨이 오르면 낙하 속도가 빨라진다.
- [ ] 로그인한 상태로 게임이 끝나면 점수가 내 계정으로 `scores`에 저장되고, 리더보드에 내 최고 점수가 반영된다.
- [ ] 로그인하지 않은 상태로 게임이 끝나면 로그인 안내가 나오고, 결과 모달에서 로그인하면 그 점수가 저장된다.
- [ ] 리더보드에는 한 사용자가 한 줄만 나오고, 이메일 대신 아이디가 보인다.
- [ ] 로그인한 사용자만 피드백을 쓸 수 있고, 30초 안에 다시 제출하면 거부된다.
- [ ] 다른 사람의 user_id로 점수나 피드백을 넣으려 하면 RLS가 거부한다.
- [ ] BGM이 반복 재생되고, 동작마다 효과음이 나며, 음소거/볼륨 설정이 새로고침 후에도 유지된다.
- [ ] 클라이언트 코드에 service_role key가 없다.
- [ ] GitHub `main`에 push하면 Vercel이 자동으로 다시 배포한다.
