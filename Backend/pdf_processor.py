# import fitz  # PyMuPDF
# import os
# from dotenv import load_dotenv
# from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain_openai import OpenAIEmbeddings, ChatOpenAI
# from langchain_community.vectorstores import FAISS
# from langchain.chains import RetrievalQA
# from langchain.prompts import PromptTemplate

# load_dotenv()

# class PDFProcessor:
#     def __init__(self):
#         self.openai_api_key = os.getenv("OPENAI_API_KEY")
#         if not self.openai_api_key:
#             raise ValueError("OpenAI API key not found in environment variables")
        
#         # Initialize components with updated imports
#         self.text_splitter = RecursiveCharacterTextSplitter(
#             chunk_size=1000,
#             chunk_overlap=200,
#             length_function=len
#         )
        
#         # Use the new langchain_openai imports
#         self.embeddings = OpenAIEmbeddings(
#             openai_api_key=self.openai_api_key,
#             model="text-embedding-3-small"  # More cost-effective
#         )
        
#         # Use ChatOpenAI instead of OpenAI (deprecated)
#         self.llm = ChatOpenAI(
#             temperature=0.3,
#             openai_api_key=self.openai_api_key,
#             model_name="gpt-3.5-turbo",  # More cost-effective than GPT-4
#             max_tokens=500  # Limit response length to save costs
#         )
        
#         # Create a custom prompt template
#         self.prompt_template = PromptTemplate(
#             template="""Use the following pieces of context to answer the question at the end. 
#             If you don't know the answer, just say that you don't know, don't try to make up an answer.
#             Keep your answer concise and relevant to the question.

#             Context: {context}

#             Question: {question}
#             Answer:""",
#             input_variables=["context", "question"]
#         )
    
#     def extract_text_from_pdf(self, pdf_path: str) -> str:
#         """Extract text from PDF file"""
#         try:
#             doc = fitz.open(pdf_path)
#             text = ""
            
#             for page_num in range(doc.page_count):
#                 page = doc[page_num]
#                 text += page.get_text()
            
#             doc.close()
#             return text.strip()
        
#         except Exception as e:
#             raise Exception(f"Error extracting text from PDF: {str(e)}")
    
#     def answer_question(self, document_text: str, question: str) -> str:
#         """Answer question based on document text"""
#         try:
#             # Split document into chunks
#             chunks = self.text_splitter.split_text(document_text)
            
#             if not chunks:
#                 return "No content found in the document to answer the question."
            
#             # Create vector store
#             vectorstore = FAISS.from_texts(chunks, self.embeddings)
            
#             # Create retrieval QA chain
#             qa_chain = RetrievalQA.from_chain_type(
#                 llm=self.llm,
#                 chain_type="stuff",
#                 retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
#                 chain_type_kwargs={"prompt": self.prompt_template},
#                 return_source_documents=False
#             )
            
#             # Generate answer
#             result = qa_chain.invoke({"query": question})
#             answer = result.get("result", "No answer generated")
            
#             return answer.strip()
            
#         except Exception as e:
#             # Better error handling
#             error_msg = str(e)
#             if "429" in error_msg or "quota" in error_msg.lower():
#                 return "Error: OpenAI API quota exceeded. Please check your billing settings and add credits to your account."
#             elif "401" in error_msg:
#                 return "Error: Invalid OpenAI API key. Please check your API key configuration."
#             else:
#                 return f"Error generating answer: {error_msg}"



import fitz  # PyMuPDF
import os
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains.question_answering import load_qa_chain

load_dotenv()

class PDFProcessor:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        
        # Initialize components
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        self.embeddings = OpenAIEmbeddings(api_key=self.openai_api_key)
        self.llm = ChatOpenAI(
            temperature=0, 
            api_key=self.openai_api_key,
            model="gpt-3.5-turbo"
        )
        self.qa_chain = load_qa_chain(self.llm, chain_type="stuff")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF file"""
        try:
            doc = fitz.open(pdf_path)
            text = ""
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text += page.get_text()
            
            doc.close()
            return text.strip()
        
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    def answer_question(self, document_text: str, question: str) -> str:
        """Answer question based on document text"""
        try:
            # Split document into chunks
            chunks = self.text_splitter.split_text(document_text)
            
            if not chunks:
                return "No content found in the document to answer the question."
            
            # Create vector store
            vectorstore = FAISS.from_texts(chunks, self.embeddings)
            
            # Find relevant chunks
            relevant_docs = vectorstore.similarity_search(question, k=3)
            
            if not relevant_docs:
                return "No relevant information found in the document to answer your question."
            
            # Generate answer
            answer = self.qa_chain.run(input_documents=relevant_docs, question=question)
            
            return answer.strip()
            
        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "billing" in error_msg.lower():
                return "Error: OpenAI API quota exceeded. Please check your OpenAI account billing."
            elif "invalid" in error_msg.lower() and "key" in error_msg.lower():
                return "Error: Invalid OpenAI API key. Please check your API key."
            else:
                return f"Error generating answer: {error_msg}"