# CLAUDE.md — 이카이브 학원 통합 관리 시스템

학원용 출결·채점·안내카드·안내문자 웹앱. 사용자 문서(배포·권한 설정 절차)는 `README.md` 참고.
**진행 이력·사용자 선호·결정 사항·보류 항목은 `HANDOFF.md`를 먼저 읽는다.**
사용자와는 **한국어**로 소통한다.

## 작업 규칙 (중요)

- **항상 `main` 브랜치에서 작업하고 `main`에 바로 푸시한다.** (사용자 요청. Vercel이 `main`을 자동 배포)
- `claude/untitled-session-8lw50v` 브랜치는 **예전 갈래이므로 무시**한다. 최신 기능이 없다.
  새 컨테이너가 이 브랜치로 열릴 수 있으니, 시작하면 `git checkout main && git pull` 부터 한다.
- 새 컨테이너에서는 `node_modules`가 없을 수 있다 → `npm ci` 후 `npm run build`.
- PR은 사용자가 요청할 때만 만든다.

## 스택

- React 18 + Vite 5 (`src/main.jsx` → `App.jsx`), 빌드 산출물 `dist/` → Vercel (`vercel.json`)
- Firebase 10: Google 로그인 + Firestore (코드 분할 import, `src/lib/firebase.js`)
- `html2canvas`(안내카드 이미지 저장), `xlsx`(명단 엑셀 업로드, 종합 엑셀 내보내기) — 둘 다 동적 import

## 데이터 구조

DB 전체가 JSON 하나로 Firestore 문서 `academy/data`에 저장되고, 로컬은 localStorage `academy_v2`.
Firestore 컬렉션 `teachers`(접근 허용 선생님), `logs`(활동 로그)는 별도.

```
classes:  [{ id, name, archived, deleteAt, tmpl(반별 안내문자 템플릿), hideTest(안내카드 테스트 그래프 숨김) }]
students: [{ id, classId, name, school, grade, studentPhone, parentPhone,
             openingSentStudent, openingSentParent, paidTuition, paidBook }]
sessions: [{ id, classId, chasi, date, hwRanges:[{start,end,req}], testTotal,
             test:{ qCount, points[], answers[], subj[] }, noTest, homework(공통숙제), progress(진도) }]
records:  { [sessionId]: { [studentId]: { attendance, note, hq{}, q{}, hw(학생별 다른 숙제), testScore } } }
settings: { tmpl }   // 전역 기본 안내문자 템플릿 (반별 tmpl 없을 때 사용)
```

- 화면 선택 상태(반·탭·차시·안내카드 학생)는 localStorage `academy_v2_ui`에 저장/복원 (`store.jsx`의 `loadUi`, 삭제된 반/차시는 기본값으로 폴백).

## 상태 관리 (`src/store.jsx`)

- `dbRef`(가변) + `mutate(fn)` → `commit()`이 localStorage·Firestore 저장 + 활동 로그(`lib/diff.js`의 `summarizeChanges`) 예약.
- **동시 편집 동기화**: 저장은 `cloud.transact`(Firestore 트랜잭션)로 클라우드 최신본을 읽어 `lib/merge.js`의 3-way 병합(`mergeDb(base, local, remote)`) 후 쓴다.
  `base`(마지막으로 클라우드와 맞춘 상태)는 localStorage `academy_v2_base`에 보관. 객체는 키별, id 배열(classes·students·sessions)은 id별 병합, 같은 칸 충돌은 이 컴퓨터 값 우선.
  수신(`onSnapshot`)도 같은 병합으로 반영(입력 중이면 칸을 벗어날 때 반영). 초기화·복원·예시 데이터(`replaceDb`)만 병합 없이 통째로 덮어쓴다.
  절대 `setDoc`으로 `academy/data` 전체를 바로 덮어쓰지 말 것(동시 접속 시 다른 컴퓨터 변경이 지워짐).
- `recOf(sessionId)`, `recFor(sessionId, studentId)`로 기록 접근. `isOwner = me.owner && !viewAsTeacher`.
- 공용 조회: `lib/session.js` — `classSessions`(차시순), `classStudents`(이름 가나다순), `resolveSessionId`.
- 계산: `lib/calc.js` — `scoreOf`, `sessionStats`, `hwItems`, `fillTemplate`, `formatPhone` 등.

## 화면 (시트)

| 탭 | 컴포넌트 | 비고 |
|---|---|---|
| ① 명단 | `RosterTab` | 주인 전용. 인라인 수정, 엑셀/붙여넣기 가져오기, 명단 복사, 개강안내(학생/학부모)·수강료·교재비 체크 |
| ② 출결 | `GradeTab mode="attend"` | 출결 버튼 + 비고 |
| ③ 채점 | `GradeTab mode="score"` | 숙제 채점(범위·필수/선택, 이전차시 숙제보기), 테스트 채점(객관식 정답 자동대조/주관식 1·0·2, 테스트 없음) |
| ④ 안내카드 | `CardsTab` + `Charts.jsx` | 이미지 저장·인쇄, 테스트 그래프 가리기 |
| ⑤ 안내·숙제 | `MsgTab` | 진도·공통숙제(주인만 수정), 반별 템플릿(주인만 수정), 학생별 다른 숙제 |
| ⑥ 종합 | `DataTab` | 주인 전용. 열 정렬, 엑셀 내보내기 |

그 외: `Sidebar`(반 목록·보관함·30일 삭제 유예), `Nav`(탭 + 차시 선택 + 오늘 날짜 다름 경고 + 📅 차시 생성기), `SessionGenerator`, `Footer`(⚙ 팝업: 선생님 화면 미리보기·활동 로그·선생님 관리·예시 데이터·백업/복원·전체 초기화), `AuthGate`(로그인 화면).

## 점수 계산 규칙 (`scoreOf`)

- `session.noTest`(테스트 없음)면 `null` → 평균·등수·종합·안내카드 그래프에서 모두 제외.
- 객관식: 학생 답 === 정답이면 득점. **정답이 비어 있는 문항은 채점 불가로 건너뜀**(0점 아님).
- 주관식: `"1"`=정답, `"0"`/`"2"`=오답.
- 채점 가능한 문항이 하나도 없으면 미응시(`null`). 숙제 완성도는 **필수** 범위만 계산.

## 권한 · 보안

- 주인 이메일은 **두 곳을 함께** 수정한다: `index.html`의 `window.SHARE.owner`, `firestore.rules`의 `isOwner()`.
- `firestore.rules`는 Vercel이 아니라 **Firebase에서 별도 배포**한다(`firebase deploy --only firestore:rules` 또는 콘솔).
  콘솔에 실제 배포된 규칙이 저장소 파일과 다를 수 있으므로, 규칙을 바꾸기 전에 사용자에게 확인한다.
- 카카오톡 등 인앱 브라우저의 `403 disallowed_useragent`는 Google OAuth 정책 문제(규칙과 무관). 외부 브라우저로 열면 해결.

## UI 관례

- 문구는 한국어. `prompt()` 팝업 대신 인라인 입력/확인을 쓴다.
- 표 셀은 줄바꿈 금지(`td { white-space: nowrap }`).
- 주인 전용 기능은 `isOwner`로 막는다(`App.jsx`도 주인 전용 탭을 한 번 더 막음).

## 검증 방법

1. `npm run build`
2. `python3 -m http.server <port> --directory dist` 로 띄운다 (백그라운드).
3. Playwright는 전역 설치(`/opt/node22/lib/node_modules`). `.cjs` 스크립트에서 `require("playwright")`,
   `NODE_PATH=/opt/node22/lib/node_modules node smoke.cjs` 로 실행. 브라우저: `executablePath: "/opt/pw-browsers/chromium"`.
4. 로그인 없이 보려면 `page.route`로 문서 HTML의 `auth: true` → `auth: false` 로 바꿔 로컬 모드(주인 권한)로 연다.
5. `button[title*="설정"]`(⚙) 클릭 → `.btn.dark`(예시 데이터 채우기)로 시드 후 각 탭을 확인한다.
6. 콘솔 에러 중 Firestore/googleapis 연결 오류는 샌드박스 네트워크 때문이므로 무시한다.
7. 테스트 스크립트는 커밋하지 않는다.
