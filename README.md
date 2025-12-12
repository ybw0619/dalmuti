# 🎴 달무티 게임 (The Great Dalmuti)

Next.js 16 + Socket.io 기반 온라인 멀티플레이어 달무티 카드 게임입니다.

## 🎮 게임 특징

- **온라인 멀티플레이어**: 실시간으로 친구들과 함께 플레이
- **AI 플레이어**: AI를 추가하여 혼자서도 게임 가능 (3단계 난이도)
- **완전한 게임 규칙**: 기본 규칙 + 혁명 + 세금 시스템
- **실시간 게임**: Socket.io를 통한 빠른 실시간 통신
- **반응형 UI**: Tailwind CSS로 제작된 아름다운 UI

## 🎯 게임 규칙

### 기본 규칙
- 1번 카드가 가장 강하고, 12번 카드가 가장 약함
- 각 등급마다 해당 번호만큼의 카드가 있음 (1번 1장, 2번 2장, ..., 12번 12장)
- 조커 2장 포함
- 같은 등급의 카드를 여러 장 동시에 낼 수 있음
- 이전 플레이어보다 강한 카드만 낼 수 있음

### 혁명
- 같은 카드를 8장 이상 내면 혁명 발동
- 혁명 시 카드 강도가 역전됨 (12번이 가장 강해짐)
- 다시 혁명이 일어나면 정상으로 복귀

### 세금
- 게임 종료 후 순위가 결정되면, 다음 게임에서 세금 교환
- 대거지(꼴등) → 대달무티(1등): 가장 강한 카드 2장
- 거지(꼴등-1) → 달무티(2등): 가장 강한 카드 1장

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어주세요.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 🏗️ 프로젝트 구조

```
dalmuti/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 메인 페이지
│   ├── layout.tsx         # 레이아웃
│   └── globals.css        # 전역 스타일
├── components/            # React 컴포넌트
│   ├── Lobby.tsx         # 로비 화면
│   ├── WaitingRoom.tsx   # 대기실
│   ├── GameBoard.tsx     # 게임 보드
│   └── Card.tsx          # 카드 컴포넌트
├── lib/                  # 유틸리티 및 로직
│   ├── game/            # 게임 로직
│   │   ├── cards.ts     # 카드 관련 함수
│   │   ├── gameLogic.ts # 게임 진행 로직
│   │   └── roomManager.ts # 방 관리
│   ├── ai/              # AI 플레이어
│   │   └── aiPlayer.ts  # AI 로직
│   └── socket/          # Socket.io
│       └── socketClient.ts
├── hooks/               # React Hooks
│   └── useSocket.ts     # Socket 관리 Hook
├── types/               # TypeScript 타입
│   └── game.ts          # 게임 타입 정의
├── server.ts            # Socket.io 서버
└── server-start.ts      # 서버 시작 스크립트
```

## 🎲 게임 플레이 방법

1. **방 만들기**
   - 플레이어 이름 입력
   - 방 이름 설정
   - 방 생성

2. **친구 초대**
   - 방 코드를 친구에게 공유
   - 친구가 방 코드로 참가

3. **AI 추가 (선택)**
   - 방장은 "AI 추가" 버튼으로 AI 플레이어 추가 가능

4. **게임 시작**
   - 모든 플레이어가 준비되면 방장이 게임 시작
   - 카드가 자동으로 분배됨

5. **게임 진행**
   - 자신의 차례에 카드 선택 후 "카드 내기"
   - 낼 카드가 없거나 전략적으로 "패스" 가능
   - 모든 플레이어가 패스하면 턴 초기화

## 🛠️ 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.io
- **Runtime**: Node.js 22+

## 📝 TODO

- [ ] 게임 히스토리 저장
- [ ] 사운드 이펙트 추가
- [ ] 애니메이션 개선
- [ ] 모바일 최적화
- [ ] 채팅 기능
- [ ] 통계 및 순위표

## 📄 라이선스

ISC

## 👨‍💻 개발자

Made with ❤️ using Claude Code
