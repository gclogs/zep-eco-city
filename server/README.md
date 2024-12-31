# Express TypeScript 서버

## 프로젝트 소개
이 프로젝트는 Express.js와 TypeScript를 기반으로한 웹 서버 애플리케이션입니다.

## 기술 스택
- Node.js
- Express.js
- TypeScript
- Jest (테스트)
- Morgan (로깅)
- Cors (Cross-Origin Resource Sharing)

## 시작하기

### 필수 요구사항
- Node.js 14.0.0 이상
- Yarn 패키지 매니저

### 설치 방법
1. 저장소 클론
```bash
git clone [repository-url]
cd server
```

2. 의존성 설치
```bash
yarn install
```

3. 환경 변수 설정
`.env` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가합니다:
```
PORT=3000
NODE_ENV=development
```

### 실행 방법

#### 개발 모드
```bash
yarn dev
```
- 파일 변경 시 자동으로 서버가 재시작됩니다.
- 기본적으로 http://localhost:3000 에서 실행됩니다.

#### 프로덕션 빌드
```bash
yarn build
```
- TypeScript 코드가 JavaScript로 컴파일됩니다.
- 빌드된 파일은 `dist` 폴더에 생성됩니다.

#### 프로덕션 실행
```bash
yarn start
```

### 테스트 실행
```bash
yarn test
```

## API 문서
기본 엔드포인트: `http://localhost:3000`

### 기본 라우트
- GET `/`: 웰컴 메시지 반환

## 참고 사항
- 코드 변경 시 `yarn dev` 명령어로 실행하면 자동으로 변경사항이 반영됩니다.
- 환경 변수는 반드시 .env 파일에 설정해야 합니다.
- TypeScript 설정은 tsconfig.json 파일에서 수정할 수 있습니다.

## 라이선스
이 프로젝트는 MIT 라이선스 하에 있습니다.
