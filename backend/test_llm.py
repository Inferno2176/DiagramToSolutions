import asyncio
import os
import json
from app.services.llm import analyze_architecture_gemini

async def test():
    ocr_text = """Simple OCR Web Project Architecture
User
Frontend
Web UI
Upload Image
Backend API
FastAPI
Receive Image
Validate File
Process with OCR
OCR Engine
PaddleOCR
Extracts Text
Confidence
Bounding Boxes
Format Result
Return JSON Response
Storage Optional
Save Uploaded Images
Logs"""
    from dotenv import load_dotenv
    load_dotenv()
    try:
        res = await analyze_architecture_gemini(ocr_text)
        print(json.dumps(res, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
