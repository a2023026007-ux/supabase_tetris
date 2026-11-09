# Block Drop (supabase_tetris)

브라우저에서 바로 플레이하는 낙하 블록 퍼즐 게임입니다.
이메일로 가입한 사용자의 점수는 Supabase에 저장되어 리더보드에 오르고, 피드백을 남길 수 있습니다.

- 프론트엔드: Vite + TypeScript + Canvas
- 백엔드: Supabase (Auth + PostgreSQL + RLS)
- 배포: Vercel
- 사운드: Web Audio API로 직접 합성한 배경음악과 효과음 (외부 음원 파일 없음)

요구사항은 [PRD](PRD_draft.md)를 참고하세요.

## 1. 로컬에서 실행

```bash
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
# .env 에 Supabase URL과 Publishable key 입력
npm run dev
```

`http://localhost:5173` 에서 열립니다. `.env`가 없어도 게임은 플레이할 수 있고, 점수 저장·로그인·피드백만 꺼집니다("오프라인 모드").

## 2. Supabase 설정

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다.
2. **SQL Editor**에 [supabase/schema.sql](supabase/schema.sql) 내용을 붙여넣고 실행합니다.
3. **Authentication → Sign In / Providers → Email**: Email 로그인과 **Confirm email**이 켜져 있는지 확인합니다.
4. **Authentication → URL Configuration**
   - **Site URL**: Vercel 배포 주소 (예: `https://supabase-tetris.vercel.app`)
   - **Redirect URLs**: 배포 주소와 `http://localhost:5173`
5. **Project Settings → API Keys**에서 `Project URL`과 `Publishable key`(sb_publishable_...)를 복사해 `.env`에 넣습니다.
6. (공개 전 권장) 기본 메일 발송은 시간당 몇 통으로 제한됩니다. **Authentication → SMTP Settings**에 외부 SMTP(Resend 등)를 연결하세요.

> Secret key(`sb_secret_...`, 예전 이름 `service_role`)는 절대 클라이언트 코드나 `.env`에 넣지 마세요.

## 3. Vercel 배포

1. 이 폴더를 GitHub 저장소 `https://github.com/a2023026007-ux/supabase_tetris.git`에 push합니다.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/a2023026007-ux/supabase_tetris.git
   git push -u origin main
   ```
2. Vercel → **Add New → Project** → 저장소 Import
   - Framework Preset: **Vite** (Build `npm run build`, Output `dist`)
3. **Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 등록 후 Deploy
4. 배포 주소가 정해지면 Supabase의 Site URL / Redirect URLs를 그 주소로 맞춥니다.

이후 `main`에 push할 때마다 자동으로 다시 배포됩니다.

## 조작

| 키 | 동작 |
|---|---|
| ← / → | 이동 (누르고 있으면 반복) |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 방향 회전 |
| Z | 반시계 방향 회전 |
| C | 홀드 |
| P / Esc | 일시정지 |
| M | 음소거 |

터치 기기에서는 화면 아래 버튼으로 조작합니다.

## 폴더 구조

```
src/
  main.ts            진입점, 게임 루프, 화면 전환
  game/              보드, 블록(7-bag), SRS 회전, 점수/레벨, 입력
  render/            Canvas 렌더링 (고스트 피스 없음)
  audio/             Web Audio 효과음 + BGM 시퀀서
  api/               Supabase 클라이언트, 인증, 점수, 피드백
  ui/                대화상자(로그인/가입/리더보드/피드백/설정/내 기록)
supabase/schema.sql  테이블, 트리거, 리더보드 뷰, RLS
```
