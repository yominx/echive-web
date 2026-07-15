# 이카이브 · 학원 통합 관리 (출결 · 채점 · 안내)

브라우저에서 바로 도는 **단일 파일 정적 웹앱**입니다. 빌드 과정이 없으며
`index.html` 하나만 서빙하면 동작합니다.

- **데이터 저장**: 기본은 브라우저 `localStorage`. `index.html` 상단의
  `window.SHARE` 설정을 채우면 Firebase Firestore로 여러 선생님이
  실시간 공유합니다.
- **로그인/접근 제어**: 구글 로그인 + 이메일 허용목록(`SHARE.allow`).
- **외부 라이브러리**: Firebase SDK와 엑셀 파서(SheetJS)는 필요할 때
  CDN에서 로드하므로 별도 설치가 필요 없습니다. (배포 서버는 인터넷만
  연결돼 있으면 됩니다.)

---

## 배포 방법 — Netlify (선택됨)

정적 파일이라 빌드가 필요 없습니다. `netlify.toml` 이 포함돼 있어
게시 폴더(루트)와 라우팅이 이미 설정돼 있습니다.

### A. GitHub 저장소 연결 (지속 배포, 권장)

푸시할 때마다 자동 배포됩니다.

1. 이 저장소에 코드가 올라가 있어야 합니다. (`index.html` 등)
2. [Netlify](https://app.netlify.com) → **Add new site → Import an
   existing project → GitHub** → `yominx/echive-web` 선택.
3. 빌드 설정은 비워두면 됩니다 (`netlify.toml` 이 대신 채웁니다).
   Publish directory = `.`, Build command = 없음.
4. **Deploy** → `https://<사이트이름>.netlify.app` 발급.

### B. 즉시 배포 (GitHub 없이, 가장 빠름)

Netlify CLI로 로컬 폴더를 바로 올립니다.

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

또는 [app.netlify.com](https://app.netlify.com) 의 **"Deploy manually"**
영역에 `index.html` 이 든 폴더를 **드래그&드롭** 하면 끝입니다.

### ⚠️ 배포 후 필수 1단계 — 구글 로그인 허용

Netlify 도메인(`<사이트이름>.netlify.app`)을 **Firebase 콘솔 →
Authentication → Settings → Authorized domains** 에 추가하세요.
추가하지 않으면 구글 로그인 팝업이 `auth/unauthorized-domain` 오류로
막힙니다. (커스텀 도메인을 붙이면 그 도메인도 함께 추가)

---

## 운영 설정 체크리스트

- **접속 허용 계정**: `index.html` 의 `window.SHARE.allow` 배열에서
  구글 이메일을 추가/삭제합니다.
- **Firestore 보안 규칙**: 실시간 공유가 안 되면 Firebase 콘솔 →
  Firestore → Rules 에서 `academy/data` 문서에 대한 읽기/쓰기가
  허용돼 있는지 확인하세요. (로그인 사용자만 허용하려면 `auth != null`
  조건 권장.)
- **백업**: 앱 하단 "백업 저장 / 백업 복원" 버튼으로 JSON을 내려받고
  복원할 수 있습니다.

## 로컬에서 열어보기

```bash
python3 -m http.server 8080
# http://localhost:8080 접속
```
