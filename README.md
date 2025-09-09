# 🗑️ 강남구 쓰레기통 관리 대시보드

강남구 쓰레기통 위치를 지도에 표시하고 시민제보 기능을 제공하는 웹 애플리케이션입니다.

## 🚀 배포 방법

### Vercel 배포 (추천)

1. **Vercel 계정 생성**
   - [vercel.com](https://vercel.com)에서 계정 생성

2. **GitHub에 코드 업로드**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin [YOUR_GITHUB_REPO_URL]
   git push -u origin main
   ```

3. **Vercel에서 배포**
   - Vercel 대시보드에서 "New Project" 클릭
   - GitHub 저장소 연결
   - 자동 배포 완료!

### 로컬 실행

```bash
# 백엔드 서버 실행
python3 app.py

# 프론트엔드 서버 실행 (새 터미널)
python3 -m http.server 8000
```

## 📁 프로젝트 구조

```
trash_dashboard/
├── index.html          # 메인 페이지
├── styles.css          # 스타일시트
├── script.js           # JavaScript 로직
├── app.py              # Flask 백엔드
├── requirements.txt    # Python 의존성
├── vercel.json         # Vercel 배포 설정
└── package.json        # Node.js 설정
```

## 🛠️ 주요 기능

- ✅ 강남구 쓰레기통 위치 지도 표시
- ✅ 시민제보 기능 (사진 업로드 + GPS 좌표)
- ✅ 실시간 통계 업데이트
- ✅ 반응형 디자인
- ✅ 서버 데이터 저장

## 📊 API 엔드포인트

- `GET /api/trash-bins` - 쓰레기통 데이터
- `GET /api/statistics` - 통계 데이터
- `GET /api/citizen-reports` - 시민제보 목록
- `POST /api/citizen-reports` - 시민제보 등록
- `GET /api/health` - 서버 상태

## 🌐 배포 URL

배포 완료 후 Vercel에서 제공하는 URL로 접속 가능합니다.
