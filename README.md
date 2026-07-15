# 이카이브 · 학원 통합 관리 (출결 · 채점 · 안내)

**React + Vite** 로 만든 학원 관리 웹앱입니다. (출결 · 숙제/테스트 채점 ·
안내카드 · 학부모 안내문자)

- **데이터 저장**: 기본은 브라우저 `localStorage`. `index.html` 상단의
  `window.SHARE` 설정을 채우면 Firebase Firestore로 여러 선생님이
  실시간 공유합니다.
- **로그인/접근 제어**: 구글 로그인 + 이메일 허용목록(`SHARE.allow`).
- **번들**: Firebase는 메인 번들에, 엑셀 파서(SheetJS)는 명단 업로드 시에만
  로드되도록 코드 분할돼 있습니다.

## 프로젝트 구조

```
index.html            Vite 진입점 + window.SHARE 설정(공유·로그인)
vite.config.js
netlify.toml          Netlify 빌드 설정 (npm run build → dist)
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

## 배포 방법 — Netlify (선택됨)

`netlify.toml` 에 빌드 명령(`npm run build`)과 게시 폴더(`dist`)가
이미 설정돼 있습니다.

### A. GitHub 저장소 연결 (지속 배포, 권장)

푸시할 때마다 자동 빌드·배포됩니다.

1. 이 저장소에 코드가 올라가 있어야 합니다.
2. [Netlify](https://app.netlify.com) → **Add new site → Import an
   existing project → GitHub** → `yominx/echive-web` 선택.
3. 빌드 설정은 비워두면 됩니다 (`netlify.toml` 이 채웁니다:
   Build command `npm run build`, Publish directory `dist`).
4. **Deploy** → `https://<사이트이름>.netlify.app` 발급.

### B. 즉시 배포 (CLI)

```bash
npm run build
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir dist
```

### ⚠️ 배포 후 필수 1단계 — 구글 로그인 허용

Netlify 도메인(`<사이트이름>.netlify.app`)을 **Firebase 콘솔 →
Authentication → Settings → Authorized domains** 에 추가하세요.
추가하지 않으면 구글 로그인 팝업이 `auth/unauthorized-domain` 오류로
막힙니다. (커스텀 도메인을 붙이면 그 도메인도 함께 추가)

---

## 운영 설정 체크리스트

- **접속 허용 계정**: `index.html` 의 `window.SHARE.allow` 배열에서
  구글 이메일을 추가/삭제합니다. (수정 후 재빌드·재배포 필요)
- **Firestore 보안 규칙**: 실시간 공유가 안 되면 Firebase 콘솔 →
  Firestore → Rules 에서 `academy/data` 문서에 대한 읽기/쓰기가
  허용돼 있는지 확인하세요. `firestore.rules` 를
  `firebase deploy --only firestore:rules` 로 올릴 수 있습니다.
- **백업**: 앱 하단 "백업 저장 / 백업 복원" 버튼으로 JSON을 내려받고
  복원할 수 있습니다.
