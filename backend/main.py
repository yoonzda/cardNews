import os
import json
import subprocess
import tempfile
from google import genai
from google.genai import types
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

# 프론트엔드 React 연동을 위한 CORS 세팅
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_hwp(hwp_path: str) -> str:
    import sys
    import shutil
    import tempfile
    
    # hwp5txt 경로 찾기
    hwp5txt_path = shutil.which('hwp5txt')
    if not hwp5txt_path:
        hwp5txt_path = os.path.join(os.path.dirname(sys.executable), 'Scripts', 'hwp5txt.exe')
        if not os.path.exists(hwp5txt_path):
            hwp5txt_path = os.path.join(os.path.dirname(sys.executable), 'bin', 'hwp5txt')
            
    cmd = [hwp5txt_path] if hwp5txt_path and os.path.exists(hwp5txt_path) else ['hwp5txt']
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_out:
        out_path = temp_out.name
        
    cmd.extend(['--output', out_path, hwp_path])
    
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            check=True,
            env=env
        )
        
        with open(out_path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except subprocess.CalledProcessError as e:
        raise Exception(f"Command '{e.cmd}' returned non-zero exit status {e.returncode}.\nStderr: {e.stderr}")
    except Exception as e:
        raise Exception(f"hwp5txt 실행 중 오류 발생: {e}")
    finally:
        if os.path.exists(out_path):
            os.unlink(out_path)

@app.post("/api/extract-news")
async def extract_news(file: UploadFile = File(...)):
    if not file.filename.endswith('.hwp'):
        raise HTTPException(status_code=400, detail="HWP 파일만 지원합니다.")
        
    try:
        # 1. HWP 파일을 임시 폴더에 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".hwp") as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name
            
        # 2. 텍스트 추출
        raw_text = extract_text_from_hwp(temp_path)
        os.remove(temp_path) # 사용 후 임시파일 삭제
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="문서에서 텍스트를 추출하지 못했습니다.")
            
        # 3. Gemini 프롬프트 엔지니어링 수행
        prompt = f"""너는 공공기관(옹진군청 등)의 전문 프레젠테이션 카피라이터이자 SNS 마케터야.
다음 [보도자료 원문]을 주의 깊게 읽고, 카드뉴스/포스터의 커버에 들어갈 제목과 SNS 업로드용 원고를 뽑아줘.

[규칙]
1. subTitle: 원문 전체를 요약하는 감성적이거나 핵심을 찌르는 부제목 (1줄, 10~20자 내외)
2. mainTitle: 보도자료의 가장 중요한 핵심 사건이나 내용을 두 줄로 나눴을 때 가장 시각적으로 예쁘게 떨어지도록 작성 (총 15~20자 내외). 줄바꿈이 필요한 위치에 반드시 '\\n' 기호를 넣어줘. (예시: 진촌리 한국 기독교의 섬\\n기념 공원 준공식)
3. instagram: 인스타그램용 본문 원고 (해시태그 포함, 트렌디하고 감성적으로)
4. facebook: 페이스북용 본문 원고 (정보 전달 위주, 친근한 톤)
5. kakaostory: 카카오스토리용 본문 원고 (주부, 중장년층 타겟으로 친근하고 따뜻한 톤)
6. blog: 블로그용 본문 원고 (상세한 내용 포함, SEO를 고려한 서론-본론-결론 구조, 제목 포함)

[보도자료 원문]
{raw_text[:3000]} # 너무 길면 잘림 방지

결과는 무조건 아래 JSON 형태로만 출력해. (```json 등 마크다운 쓰지 말 것)
{{
    "subTitle": "여기에 부제목",
    "mainTitle": "첫번째줄\\n두번째줄",
    "instagram": "인스타그램 원고 내용...",
    "facebook": "페이스북 원고 내용...",
    "kakaostory": "카카오스토리 원고 내용...",
    "blog": "블로그 원고 내용..."
}}"""

        # 4. Gemini API 호출 (최대 3회 자동 재시도)
        import time
        max_retries = 3
        text_response = ""
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                )
                text_response = response.text.replace('```json', '').replace('```', '').strip()
                break # 성공하면 루프 탈출
            except Exception as e:
                last_exception = e
                print(f"Gemini API 호출 에러 발생. 재시도 중... ({attempt + 1}/{max_retries}) - {e}")
                if attempt < max_retries - 1:
                    # 무료 티어 제한(429) 회피를 위해 대기 시간을 길게 잡음
                    time.sleep(15)
        else:
            # 3번 모두 실패한 경우
            raise Exception(f"무료 API 제한 또는 서버 혼잡으로 호출에 실패했습니다. (3회 재시도 실패). 잠시 후 다시 시도해주세요. 상세: {last_exception}")
        
        # 5. JSON 파싱 후 프론트엔드로 반환
        return json.loads(text_response)
        
    except Exception as e:
        print(f"Error details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
