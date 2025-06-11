from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime
from typing import List
import uuid

from database import get_db, engine
from models import Base, Document, Question
from pdf_processor import PDFProcessor

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PDF Q&A Application")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PDF processor
pdf_processor = PDFProcessor()

# Create uploads directory
os.makedirs("uploads", exist_ok=True)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process PDF document"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text from PDF
        extracted_text = pdf_processor.extract_text_from_pdf(file_path)
        
        if not extracted_text.strip():
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Save document info to database
        document = Document(
            id=file_id,
            filename=file.filename,
            file_path=file_path,
            extracted_text=extracted_text,
            upload_date=datetime.utcnow()
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return JSONResponse({
            "message": "PDF uploaded successfully",
            "document_id": document.id,
            "filename": document.filename,
            "upload_date": document.upload_date.isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
@app.post("/ask-question")
async def ask_question(
    document_id: str,
    question: str,
    db: Session = Depends(get_db)
):
    """Ask question about uploaded document"""
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Validate question
        if not question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Generate answer using PDF processor
        answer = pdf_processor.answer_question(document.extracted_text, question)
        
        # Check if answer indicates an API error
        if answer.startswith("Error: OpenAI API quota exceeded"):
            raise HTTPException(
                status_code=402, 
                detail="OpenAI API quota exceeded. Please add credits to your OpenAI account."
            )
        elif answer.startswith("Error: Invalid OpenAI API key"):
            raise HTTPException(
                status_code=401, 
                detail="Invalid OpenAI API key. Please check your configuration."
            )
        
        # Save question and answer to database
        question_record = Question(
            document_id=document_id,
            question=question,
            answer=answer,
            timestamp=datetime.utcnow()
        )
        
        db.add(question_record)
        db.commit()
        
        return JSONResponse({
            "question": question,
            "answer": answer,
            "timestamp": question_record.timestamp.isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=402, 
                detail="OpenAI API quota exceeded. Please add credits to your OpenAI account."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error answering question: {error_msg}")
@app.get("/documents")
async def get_documents(db: Session = Depends(get_db)):
    """Get list of uploaded documents"""
    try:
        documents = db.query(Document).all()
        return JSONResponse([{
            "id": doc.id,
            "filename": doc.filename,
            "upload_date": doc.upload_date.isoformat()
        } for doc in documents])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")

@app.get("/document/{document_id}/questions")
async def get_document_questions(document_id: str, db: Session = Depends(get_db)):
    """Get questions and answers for a specific document"""
    try:
        questions = db.query(Question).filter(Question.document_id == document_id).all()
        return JSONResponse([{
            "question": q.question,
            "answer": q.answer,
            "timestamp": q.timestamp.isoformat()
        } for q in questions])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching questions: {str(e)}")

@app.get("/")
async def root():
    return {"message": "PDF Q&A API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)