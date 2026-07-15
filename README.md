# 이카이브 · 학원 통합 관리 (출결 · 채점 · 안내)

**React + Vite** 로 만든 학원 관리 웹앱입니다. (출결 · 숙제/테스트 채점 ·
안내카드 · 학부모 안내문자)

- **데이터 저장**: 기본은 브라우저 `localStorage`. `index.html` 상단의
  `window.SHARE` 설정을 채우면 Firebase Firestore로 여러 선생님이
  실시간 공유합니다.
- **로그인/접근 제어**: 구글 로그인. 접근 허용 계정은 **앱 안 "선생님
  관리"** 에서 주인(관리자)이 추가/삭제하며, 목록은 Firebase(Firestore)에
  저장됩니다. 주인 계정만 `index.html` 의 `window.SHARE.owner` 에 지정.
- **번들**: Firebase는 메인 번들에, 엑셀 파서(SheetJS)는 명단 업로드 시에만
  로드되도록 코드 분할돼 있습니다.

## 프로젝트 구조

```
index.html            Vite 진입점 + window.SHARE 설정(공유·로그인)
vite.config.js
vercel.json           Vercel 빌드 설정 (npm run build → dist)
firebase.json         Firestore 규칙 배포용
firestore.rules       공유 데이터 보안 규칙
legacy/index.html     이전 단일 파일 버전(참고용 보존)
src/
  main.jsx            React 진입
  App.jsx             셸 + 로그인 게이트 + 부팅
  store.jsx           상태 관리 + 클라우드 동기화
  index.css           스타일
  lib/
    constants.js      상수 · 로고
    db.js             데이터 모델 · 저장/복원 · 예시데이터
    calc.js           채점/통계/템플릿 등 순수 로직
    firebase.js       Firestore 실시간 동기화 + 구글 로그인
  components/         Header, ClassBar, Nav, Footer, AuthGate,
                      RosterTab, GradeTab, CardsTab, MsgTab, Charts
```

## 로컬 개발

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 로 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

> 로컬에서 구글 로그인까지 확인하려면 `localhost` 를 Firebase 콘솔의
> Authorized domains 에 추가하세요(기본 포함돼 있는 경우가 많습니다).

---

## 배포 방법 — Vercel (선택됨)

Vite 프로젝트라 Vercel이 자동 감지합니다. `vercel.json` 에 프레임워크·
빌드 명령(`npm run build`)·출력 폴더(`dist`)가 명시돼 있습니다.

### A. GitHub 저장소 연결 (지속 배포, 권장)

푸시할 때마다 자동 빌드·배포됩니다.

1. 이 저장소에 코드가 올라가 있어야 합니다.
2. [Vercel](https://vercel.com/new) → **Add New… → Project → Import
   Git Repository** → `yominx/echive-web` 선택.
3. 빌드 설정은 그대로 두면 됩니다 (Framework: Vite, Build:
   `npm run build`, Output: `dist` 자동 인식).
4. **Deploy** → `https://<프로젝트이름>.vercel.app` 발급.

### B. 즉시 배포 (CLI)

```bash
npm install -g vercel
vercel          # 미리보기 배포
vercel --prod   # 프로덕션 배포
```

### ⚠️ 배포 후 필수 1단계 — 구글 로그인 허용

Vercel 도메인(`<프로젝트이름>.vercel.app`)을 **Firebase 콘솔 →
Authentication → Settings → Authorized domains** 에 추가하세요.
추가하지 않으면 구글 로그인 팝업이 `auth/unauthorized-domain` 오류로
막힙니다. (커스텀 도메인을 붙이면 그 도메인도 함께 추가. 참고로 Vercel은
프리뷰 배포마다 도메인이 바뀌므로, 로그인 테스트는 프로덕션 도메인이나
고정 도메인에서 하세요.)

---

## 접근 권한(선생님) 관리

계정 관리는 **Firebase 한 곳**에서 이뤄집니다. 하드코딩된 허용 목록은
없습니다.

1. **주인(관리자)** 은 `index.html` 의 `window.SHARE.owner` 에 지정된
   계정입니다. (여러 명이면 배열) 이 값은 **보안 규칙**에도 동일하게
   있어야 하므로 `firestore.rules` 의 `isOwner()` 안 이메일도 함께
   맞춰주세요.
2. 주인으로 로그인하면 화면 하단 **"선생님 관리"** 버튼이 보입니다.
   여기서 선생님 구글 이메일을 추가/삭제하면 **Firestore `teachers`
   컬렉션**에 저장되고, 재배포 없이 즉시 반영됩니다.
3. 등록되지 않은 계정으로 로그인하면 "접근 권한이 없습니다" 안내
   화면이 뜹니다.

### Firestore 보안 규칙 배포 (최초 1회 필수)

`teachers` 기반 접근제어가 동작하려면 `firestore.rules` 를 반드시
올려야 합니다.

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

또는 Firebase 콘솔 → Firestore → **Rules** 탭에 `firestore.rules`
내용을 붙여넣고 **게시**합니다.

## 운영 체크리스트

- **로그인이 `auth/unauthorized-domain` 으로 막힐 때**: 지금 접속한
  도메인(예: `xxxx.vercel.app`)을 Firebase 콘솔 → Authentication →
  Settings → **Authorized domains** 에 추가하세요. (오류 화면에도 현재
  주소가 안내됩니다.)
- **백업**: 앱 하단 "백업 저장 / 백업 복원" 버튼으로 JSON을 내려받고
  복원할 수 있습니다.
