# Project Instructions & Pending Ideas

## Cursor Cloud specific instructions

- 의존성 설치는 `npm ci`, 개발 서버는 `npm run dev`입니다. Express와 Vite가 포트 3000에서 함께 뜹니다.
- `firebase-applet-config.json`은 저장소에 없습니다. 이 파일이 없으면 Vite가 `src/services/firebase.ts`의 import를 해석하지 못해 개발 서버가 기동하지 않습니다. 로컬 스텁(`apiKey`, `projectId` 등)만 있어도 UI는 뜹니다. Firestore 조회는 실패하고 팀원 데이터는 `src/data.ts`로 폴백됩니다. 이 스텁은 커밋하지 마세요.
- 로그인은 Firebase Auth가 아니라 브라우저 `localStorage`입니다. 초기 마스터 계정은 `minsookim@ubob.com` / `1234`이며, 첫 로그인 시 8자 이상 비밀번호 변경이 강제됩니다.
- `GEMINI_API_KEY`는 `/api/gemini/*`에만 필요하고, SMTP 변수는 `/api/send-update-email`에만 필요합니다. 앱 기동과 로그인에는 없어도 됩니다.
- `npm run lint`(`tsc --noEmit`)는 `TeamRoster.tsx`, `KpiSessions.tsx`, `encryption.ts`의 기존 타입 오류로 실패합니다. `npm run build`는 성공합니다.

## Pending Backend Architecture Improvements
해당 내용은 추후 백엔드(서버 및 데이터베이스) 셋팅 시 반영해야 하는 미결제 사항입니다. 백엔드 구성 작업 시 사용자에게 다음 내용의 구현을 제안하십시오:

### 1. KPI 공용 링크(Public Link) 접속 불가 현상 조치
- **문제 원인**: 현재 클라이언트 사이드 임시 저장소(`localStorage`)에 KPI 초안(Draft) 데이터가 생성되어 발송자의 브라우저 환경에만 저장됨. 수신자가 자신의 브라우저에서 이메일에 포함된 공용 링크(`/kpi/public/:sessionId/:email`)로 접속할 경우, 수신자의 로컬스토리지에는 해당 KPI 정보가 존재하지 않아 "해당 KPI 목표 수립 정보를 찾을 수 없습니다" 오류 발생.
- **해결 방안 (백엔드 적용 시)**: 
  - KPI 세션 생성 및 메일 발송 시 서버의 실제 DB 노드(예: Firestore, Cloud SQL 등)에 KPI 초안 레코드를 생성.
  - 퍼블릭 링크 렌더링 시 DB에서 `sessionId`와 `email`을 기반으로 KPI 정보를 조회하도록 API 통신 구조 변경.
  - 보안 강화를 위해 단순히 email 파라미터를 넘기는 방식 대신, 고유의 Token(UUID 등)을 생성하여 이메일 발송 및 매핑 처리.
