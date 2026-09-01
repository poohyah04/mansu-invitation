# Shorts Studio

긴 영상에서 숏폼으로 쓸 만한 구간을 찾아 9:16 세로 영상으로 만들어 주는 도구입니다.
**내 컴퓨터에서 돌리는 로컬 도구**입니다. 영상과 음성이 밖으로 나가지 않습니다.

영상 파일을 올리면 이 순서로 진행됩니다.

```
영상 업로드
  → ffmpeg 로 16kHz 모노 음성 추출
  → whisper 로 받아쓰기 (타임스탬프 포함)
  → Claude 가 핵심 구간 선정 (점수·훅·설명문)
  → 고른 구간을 ffmpeg 로 9:16 mp4 인코딩 (자막 굽기 선택)
```

구간마다 다음이 나옵니다.

- 시작·끝 시각, 0~100점 점수와 점수 근거
- 화면에 얹을 훅 문구, 자막에서 그대로 가져온 첫 대사
- 업로드용 설명문과 해시태그
- 그 구간만 0초 기준으로 다시 매긴 `.srt`
- 브라우저에서 바로 보고 내려받는 mp4

## 준비물

| | 무엇 | 설치 |
| --- | --- | --- |
| 필수 | ffmpeg | macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg` |
| 필수 | whisper | macOS `brew install whisper-cpp` · 그 밖에는 [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 빌드 |
| 필수 | whisper 모델 | ggml 모델 파일 하나를 `models/` 에 두기 (아래 참고) |
| 필수 | Anthropic API 키 | https://console.anthropic.com |

### whisper 모델 받기

한국어는 `large-v3-turbo` 를 권합니다. 정확도가 확연히 좋고 속도도 빠릅니다.

```bash
mkdir -p models
curl -L -o models/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

파일이 약 1.6GB 입니다. 디스크가 빠듯하면 `ggml-medium.bin`(1.5GB)이나
`ggml-small.bin`(0.5GB)도 됩니다. 작을수록 빠르지만 한국어 정확도가 떨어집니다.

모델을 다른 곳에 두었다면 `WHISPER_MODEL` 로 경로를 지정하세요.

## 실행

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 를 채운다
npm run dev                  # http://localhost:3000
```

```bash
npm test                     # ffmpeg 가 있으면 실제 인코딩까지 검증한다
npm run build
```

## 입력 방법

| 방법 | 되는 것 |
| --- | --- |
| **영상 파일** | 받아쓰기 → 구간 선정 → 실제 mp4 만들기까지 전부 |
| 유튜브 링크 | 자막이 켜진 영상만. 영상 파일이 없으므로 기획안과 `ffmpeg` 명령까지 |
| 자막 붙여넣기 | SRT · WebVTT · `[01:23] 내용` 형식. 기획안까지 |

유튜브는 자동 요청을 자주 막습니다. 막히면 화면이 자막 탭으로 넘어가니 직접
붙여넣으면 됩니다. 남의 영상을 내려받아 재가공하는 것은 이용약관과 저작권 문제가
있으니 본인 영상에 쓰는 것을 권합니다.

## 얼마나 걸리나

1시간짜리 설교 영상 기준 대략 이렇습니다.

| 단계 | 시간 |
| --- | --- |
| 음성 추출 | 30초 안팎 |
| 받아쓰기 | 맥(Metal 가속) 5~10분 · 일반 CPU 20~40분 |
| 구간 선정 | 1~2분 |
| 클립 1개 인코딩 | 10~30초 |

받아쓰기가 대부분을 차지합니다. 진행률은 화면에 실시간으로 나옵니다.

## 설정

| 환경 변수 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | 필수 |
| `SHORTS_MODEL` | 분석 모델. 기본 `claude-opus-5` |
| `WHISPER_BIN` | whisper 실행 파일 경로. 기본은 PATH 에서 찾음 |
| `WHISPER_MODEL` | ggml 모델 경로. 기본은 `models/` 의 첫 `.bin` |
| `FFMPEG_BIN` · `FFPROBE_BIN` | 기본은 PATH 에서 찾음 |

## 구조

```
app/
  page.tsx                        입력 · 진행률 · 결과 화면
  api/jobs/route.ts               영상 업로드 (원시 본문을 디스크로 흘려보냄)
  api/jobs/[id]/route.ts          작업 상태 폴링
  api/jobs/[id]/transcribe        음성 추출 + 받아쓰기 (백그라운드)
  api/jobs/[id]/analyze           구간 선정 (백그라운드)
  api/jobs/[id]/render            선택한 클립 인코딩 (백그라운드)
  api/jobs/[id]/clip/[rank]       만들어진 mp4 스트리밍
  api/jobs/[id]/subtitles         전체 또는 클립별 SRT
  api/transcript · api/analyze    유튜브 · 붙여넣기 경로
lib/
  proc.ts        자식 프로세스 실행과 줄 단위 출력 수집
  media.ts       ffmpeg/ffprobe — 길이 측정, 음성 추출, 9:16 인코딩
  whisper.ts     whisper 실행 파일 탐지(cpp/파이썬 구분), 전사, 진행률
  jobs.ts        작업 상태 보관과 작업 폴더 정리
  analyze.ts     Claude 호출 (구조화 출력), 길이·순위 정규화
  transcript.ts  SRT/VTT/평문 파싱, LLM 입력용 직렬화, 구간 자르기
  ffmpeg.ts      직접 실행할 ffmpeg 명령과 클립별 SRT 생성
  youtube.ts     영상 ID 추출, 자막 트랙 수집
```

### 알아둘 점

- 업로드한 원본과 만든 클립은 `.shorts-work/<작업ID>/` 에 남습니다.
  12시간이 지난 폴더는 새 작업을 시작할 때 지웁니다. 필요한 영상은 내려받아 두세요.
- 작업 진행 상태는 메모리에만 있습니다. 서버를 재시작하면 진행률은 잃지만
  이미 만들어진 파일은 작업 폴더에 그대로 남습니다.
- 인코딩은 한 번에 하나씩 돌립니다. 동시에 여러 개를 돌리면 서로 느려집니다.
- 이 구조는 서버리스(Vercel 등)에 올릴 수 없습니다. ffmpeg 와 whisper 가 상주하는
  환경이 필요합니다. 배포하려면 Railway·Fly.io 같은 곳의 상시 컨테이너를 쓰세요.

## 다음에 붙일 만한 것

- 얼굴 추적 기반 세로 리프레임 (지금은 가운데 자르기 / 흐린 배경 두 가지)
- 화자 분리로 대담·인터뷰 영상 2분할 레이아웃
- 만든 클립을 유튜브·인스타에 바로 올리기
