# Shorts Studio

긴 영상의 자막을 읽고 숏폼으로 쓸 만한 구간을 골라 주는 도구입니다.
유튜브 링크를 넣거나 자막을 붙여넣으면, 구간별로 다음을 만들어 줍니다.

- 시작·끝 시각과 0~100점 점수, 점수 근거
- 화면에 얹을 훅 문구와 첫 3초에 나오는 실제 대사
- 업로드용 설명문과 해시태그
- 그 구간만 0초 기준으로 다시 매긴 `.srt` 자막
- 9:16 세로 영상으로 뽑는 `ffmpeg` 명령

## 이 도구가 하지 않는 것

**영상 파일을 직접 렌더링하지 않습니다.** 자막을 읽고 편집 기획안까지만 만듭니다.
실제 mp4 는 내려받은 `ffmpeg` 명령을 본인 컴퓨터에서 실행하거나,
결과를 Vrew·CapCut·프리미어에 옮겨 넣어 뽑습니다.

이렇게 나눈 이유는 영상 인코딩이 서버리스 함수에서 돌아가지 않기 때문입니다.
전사·컷·인코딩까지 서비스 안에서 하려면 FFmpeg 와 Whisper 가 상주하는
별도 워커 서버가 필요합니다. 그건 이 저장소의 범위 밖입니다.

## 실행

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 를 채운다
npm run dev                  # http://localhost:3000
```

```bash
npm test        # 파싱 · 자막 · ffmpeg 명령 생성 테스트
npm run build
```

## 입력 방법

| 방법 | 설명 |
| --- | --- |
| 유튜브 링크 | watch · youtu.be · shorts · live · embed 주소를 모두 받습니다. 자막이 켜진 영상만 됩니다. |
| 자막 붙여넣기 | SRT · WebVTT · `[01:23] 내용` 형식을 읽습니다. |

유튜브는 자동 요청을 자주 차단합니다. 막히면 화면이 자동으로 자막 탭으로 넘어가니,
유튜브 자막을 직접 복사해 붙여넣으면 됩니다. 남의 영상을 내려받아 재가공하는 것은
유튜브 이용약관과 저작권 문제가 있으니, 본인 영상에 쓰는 것을 권합니다.

## 구조

```
app/
  page.tsx               입력 폼과 결과 화면 (클라이언트 컴포넌트)
  api/transcript/route.ts 유튜브 자막 수집
  api/analyze/route.ts    구간 분석 요청 검증 및 오류 처리
lib/
  youtube.ts    영상 ID 추출, watch 페이지에서 자막 트랙 찾기
  transcript.ts SRT/VTT/평문 파싱, LLM 입력용 직렬화, 구간 자르기
  analyze.ts    Claude 호출 (구조화 출력), 길이·순위 정규화
  ffmpeg.ts     9:16 변환 명령과 클립별 SRT 생성
  time.ts       타임코드 변환
```

분석은 Claude Opus 5 의 구조화 출력(`output_config.format`)으로 스키마를 고정해서
받습니다. 자막은 12초 단위로 묶어 문단처럼 만들어 넘기므로, 짧은 큐가 수천 개인
영상도 토큰이 과하게 들지 않습니다.

## 설정

| 환경 변수 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | 필수. https://console.anthropic.com 에서 발급 |
| `SHORTS_MODEL` | 선택. 기본 `claude-opus-5` |

## 다음에 붙일 것

- 영상 파일 업로드 + Whisper 전사 (자막 없는 영상 대응)
- 렌더링 워커 (Railway/Fly.io 등에서 FFmpeg 상주) 와 작업 큐
- 얼굴 추적 기반 세로 리프레임 (MediaPipe/YOLO)
