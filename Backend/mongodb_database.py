import motor.motor_asyncio
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime
import uuid

load_dotenv()

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "pdf_qa_db"

# Async MongoDB client for FastAPI
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]

# Collections
documents_collection = database.documents
questions_collection = database.questions

# Sync client for non-async operations if needed
sync_client = MongoClient(MONGODB_URL)
sync_database = sync_client[DATABASE_NAME]

class DocumentManager:
    @staticmethod
    async def create_document(filename: str, file_path: str, extracted_text: str):
        document_id = str(uuid.uuid4())
        document = {
            "_id": document_id,
            "filename": filename,
            "file_path": file_path,
            "extracted_text": extracted_text,
            "upload_date": datetime.utcnow()
        }
        await documents_collection.insert_one(document)
        return document
    
    @staticmethod
    async def get_document(document_id: str):
        return await documents_collection.find_one({"_id": document_id})
    
    @staticmethod
    async def get_all_documents():
        cursor = documents_collection.find({})
        return await cursor.to_list(length=None)

class QuestionManager:
    @staticmethod
    async def create_question(document_id: str, question: str, answer: str):
        question_doc = {
            "_id": str(uuid.uuid4()),
            "document_id": document_id,
            "question": question,
            "answer": answer,
            "timestamp": datetime.utcnow()
        }
        await questions_collection.insert_one(question_doc)
        return question_doc
    
    @staticmethod
    async def get_questions_by_document(document_id: str):
        cursor = questions_collection.find({"document_id": document_id})
        return await cursor.to_list(length=None)