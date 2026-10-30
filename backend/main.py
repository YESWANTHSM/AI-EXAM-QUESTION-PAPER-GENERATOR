import os
import io
import json
import shutil
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import engine, Base, get_db
from models import (
    User, Subject, UploadedDocument, Question, QuestionPaperTemplate,
    GeneratedPaper, PaperSection, PaperQuestion, SystemSetting
)
from seed_data import seed_database
from document_parser import DocumentParser
from ai_engine import AIEngine
from export_service import ExportService

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
db_init = next(get_db())
try:
    seed_database(db_init)
finally:
    db_init.close()

# Uploads directory
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="AI-Based Question Paper Generator API",
    description="Automated Examination Question Paper Generation and Interactive Editor System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# 1. DASHBOARD & STATS
# -------------------------------------------------------------
@app.get("/api/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_docs = db.query(UploadedDocument).count()
    total_questions = db.query(Question).count()
    total_papers = db.query(GeneratedPaper).count()

    recent_papers = db.query(GeneratedPaper).order_by(GeneratedPaper.updated_at.desc()).limit(5).all()
    recent_uploads = db.query(UploadedDocument).order_by(UploadedDocument.created_at.desc()).limit(5).all()

    # Subject-wise question counts
    subjects = db.query(Subject).all()
    subject_stats = []
    for s in subjects:
        q_count = db.query(Question).filter(Question.subject_id == s.id).count()
        subject_stats.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "question_count": q_count
        })

    # Difficulty distribution
    diff_counts = db.query(Question.difficulty, func.count(Question.id)).group_by(Question.difficulty).all()
    difficulty_dist = {d: count for d, count in diff_counts if d}
    for k in ["Easy", "Medium", "Hard"]:
        if k not in difficulty_dist:
            difficulty_dist[k] = 0

    # Bloom's level distribution
    blooms_counts = db.query(Question.blooms_level, func.count(Question.id)).group_by(Question.blooms_level).all()
    blooms_dist = {b: count for b, count in blooms_counts if b}

    return {
        "total_documents": total_docs,
        "total_questions": total_questions,
        "total_papers": total_papers,
        "recent_papers": [
            {
                "id": p.id,
                "title": p.title,
                "subject_code": p.subject.code if p.subject else "",
                "subject_name": p.subject.name if p.subject else "",
                "total_marks": p.total_marks,
                "date_str": p.date_str,
                "status": p.status,
                "updated_at": p.updated_at.isoformat() if p.updated_at else p.created_at.isoformat()
            }
            for p in recent_papers
        ],
        "recent_uploads": [
            {
                "id": u.id,
                "filename": u.filename,
                "file_type": u.file_type,
                "file_size": u.file_size,
                "extracted_count": u.extracted_count,
                "status": u.status,
                "created_at": u.created_at.isoformat()
            }
            for u in recent_uploads
        ],
        "subject_stats": subject_stats,
        "difficulty_dist": difficulty_dist,
        "blooms_dist": blooms_dist
    }

# -------------------------------------------------------------
# 2. SUBJECTS
# -------------------------------------------------------------
@app.get("/api/subjects")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "department": s.department,
            "semester": s.semester,
            "regulation": s.regulation,
            "description": s.description,
            "question_count": db.query(Question).filter(Question.subject_id == s.id).count()
        }
        for s in subjects
    ]

@app.post("/api/subjects")
def create_subject(data: Dict[str, Any], db: Session = Depends(get_db)):
    sub = Subject(
        name=data.get("name", "New Subject").strip(),
        code=data.get("code", "SUB001").strip().upper(),
        department=data.get("department", "Computer Science and Engineering").strip(),
        semester=int(data.get("semester", 5)),
        regulation=data.get("regulation", "Anna University 2023").strip(),
        description=data.get("description", "").strip()
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "name": sub.name,
        "code": sub.code,
        "department": sub.department,
        "semester": sub.semester,
        "regulation": sub.regulation,
        "description": sub.description,
        "question_count": 0
    }

@app.put("/api/subjects/{subject_id}")
def update_subject(subject_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    if "name" in data:
        sub.name = data["name"].strip()
    if "code" in data:
        sub.code = data["code"].strip().upper()
    if "department" in data:
        sub.department = data["department"].strip()
    if "semester" in data:
        sub.semester = int(data["semester"])
    if "regulation" in data:
        sub.regulation = data["regulation"].strip()
    if "description" in data:
        sub.description = data["description"].strip()

    db.commit()
    return {"success": True, "message": "Subject updated successfully"}

@app.delete("/api/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.delete(sub)
    db.commit()
    return {"success": True, "message": "Subject deleted successfully"}

@app.post("/api/subjects/reset-all")
def reset_all_data(db: Session = Depends(get_db)):
    """Clears all subjects, questions, documents, and generated papers to give the user a 100% clean slate."""
    db.query(PaperQuestion).delete()
    db.query(PaperSection).delete()
    db.query(GeneratedPaper).delete()
    db.query(Question).delete()
    db.query(UploadedDocument).delete()
    db.query(Subject).delete()
    db.commit()
    return {"success": True, "message": "All subjects and questions cleared for manual user setup."}


# -------------------------------------------------------------
# 3. DOCUMENT UPLOAD & PARSING
# -------------------------------------------------------------
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject_id: int = Form(...),
    doc_category: str = Form("question_bank"), # question_bank, sample_paper, previous_paper, syllabus
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".csv"]
    if file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {file_ext}. Allowed: {allowed_exts}")

    saved_filename = f"{subject.code}_{doc_category}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Ingest document
    parse_result = DocumentParser.parse_file(file_path, doc_category=doc_category, default_subject_id=subject_id)

    doc_record = UploadedDocument(
        filename=file.filename,
        file_path=file_path,
        file_type=file_ext.replace(".", ""),
        file_size=file_size,
        doc_category=doc_category,
        subject_id=subject_id,
        status="processed" if parse_result["success"] else "failed",
        extracted_count=parse_result.get("extracted_count", 0),
        error_message=parse_result.get("error") if not parse_result["success"] else None,
        detected_metadata=json.dumps(parse_result.get("metadata", {}))
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # If questions extracted, add to question bank
    saved_questions = 0
    if parse_result["success"] and parse_result.get("questions"):
        for q in parse_result["questions"]:
            new_q = Question(
                subject_id=subject_id,
                unit=q.get("unit", 1),
                topic=q.get("topic", "Core Concepts"),
                question_text=q.get("question_text"),
                marks=q.get("marks", 2),
                question_type=q.get("question_type", "Short Answer"),
                difficulty=q.get("difficulty", "Medium"),
                blooms_level=q.get("blooms_level", "Understand"),
                course_outcome=q.get("course_outcome", f"CO{q.get('unit', 1)}"),
                source_doc_id=doc_record.id,
                is_ai_generated=False,
                sample_answer=q.get("sample_answer"),
                rubric_json=q.get("rubric_json")
            )
            db.add(new_q)
            saved_questions += 1
        db.commit()

    return {
        "success": parse_result["success"],
        "document_id": doc_record.id,
        "filename": doc_record.filename,
        "file_size": doc_record.file_size,
        "extracted_count": saved_questions,
        "status": doc_record.status,
        "metadata": parse_result.get("metadata", {}),
        "error": parse_result.get("error")
    }

@app.post("/api/documents/parse-text")
async def parse_text_questions(
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    subject_id = int(data.get("subject_id", 1))
    text_content = data.get("text", "").strip()
    if not text_content:
        raise HTTPException(status_code=400, detail="Text content is required")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    parse_result = DocumentParser.parse_text(text_content, default_subject_id=subject_id)
    
    doc_record = UploadedDocument(
        filename=f"Direct_Text_Input_{subject.code}.txt",
        file_path="direct_text_input",
        file_type="txt",
        file_size=len(text_content.encode("utf-8")),
        doc_category="question_bank",
        subject_id=subject_id,
        status="processed" if parse_result["success"] else "failed",
        extracted_count=parse_result.get("extracted_count", 0),
        detected_metadata=json.dumps(parse_result.get("metadata", {}))
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    saved_questions = 0
    if parse_result["success"] and parse_result.get("questions"):
        for q in parse_result["questions"]:
            new_q = Question(
                subject_id=subject_id,
                unit=q.get("unit", 1),
                topic=q.get("topic", "Core Concepts"),
                question_text=q.get("question_text"),
                marks=q.get("marks", 2),
                question_type=q.get("question_type", "Short Answer"),
                difficulty=q.get("difficulty", "Medium"),
                blooms_level=q.get("blooms_level", "Understand"),
                course_outcome=q.get("course_outcome", f"CO{q.get('unit', 1)}"),
                source_doc_id=doc_record.id,
                is_ai_generated=False,
                sample_answer=q.get("sample_answer"),
                rubric_json=q.get("rubric_json")
            )
            db.add(new_q)
            saved_questions += 1
        db.commit()

    return {
        "success": parse_result["success"],
        "document_id": doc_record.id,
        "extracted_count": saved_questions,
        "questions": parse_result.get("questions", [])
    }

@app.get("/api/documents")
def list_documents(subject_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(UploadedDocument)
    if subject_id:
        query = query.filter(UploadedDocument.subject_id == subject_id)
    docs = query.order_by(UploadedDocument.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "doc_category": d.doc_category,
            "subject_id": d.subject_id,
            "subject_code": d.subject.code if d.subject else "",
            "subject_name": d.subject.name if d.subject else "",
            "status": d.status,
            "extracted_count": d.extracted_count,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat()
        }
        for d in docs
    ]

@app.get("/api/documents/{doc_id}/extracted-questions")
def get_document_questions(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    questions = db.query(Question).filter(Question.source_doc_id == doc_id).all()
    return [
        {
            "id": q.id,
            "unit": q.unit,
            "topic": q.topic,
            "question_text": q.question_text,
            "marks": q.marks,
            "question_type": q.question_type,
            "difficulty": q.difficulty,
            "blooms_level": q.blooms_level,
            "course_outcome": q.course_outcome,
            "sample_answer": q.sample_answer
        }
        for q in questions
    ]

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except:
            pass

    # Delete related questions
    db.query(Question).filter(Question.source_doc_id == doc_id).delete()
    db.delete(doc)
    db.commit()
    return {"success": True, "message": "Document and associated questions deleted."}

# -------------------------------------------------------------
# 4. QUESTION BANK MANAGEMENT
# -------------------------------------------------------------
@app.get("/api/questions")
def get_questions(
    subject_id: Optional[int] = None,
    unit: Optional[int] = None,
    topic: Optional[str] = None,
    marks: Optional[int] = None,
    difficulty: Optional[str] = None,
    blooms_level: Optional[str] = None,
    question_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Question)

    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if unit:
        query = query.filter(Question.unit == unit)
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
    if marks:
        query = query.filter(Question.marks == marks)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if blooms_level:
        query = query.filter(Question.blooms_level == blooms_level)
    if question_type:
        query = query.filter(Question.question_type == question_type)
    if search:
        query = query.filter(Question.question_text.ilike(f"%{search}%"))

    questions = query.order_by(Question.unit.asc(), Question.marks.asc()).all()
    return [
        {
            "id": q.id,
            "subject_id": q.subject_id,
            "subject_code": q.subject.code if q.subject else "",
            "subject_name": q.subject.name if q.subject else "",
            "unit": q.unit,
            "topic": q.topic,
            "question_text": q.question_text,
            "marks": q.marks,
            "question_type": q.question_type,
            "difficulty": q.difficulty,
            "blooms_level": q.blooms_level,
            "course_outcome": q.course_outcome,
            "source_doc_id": q.source_doc_id,
            "is_ai_generated": q.is_ai_generated,
            "sample_answer": q.sample_answer,
            "rubric_json": q.rubric_json
        }
        for q in questions
    ]

@app.post("/api/questions")
def add_question(data: Dict[str, Any], db: Session = Depends(get_db)):
    new_q = Question(
        subject_id=data.get("subject_id", 1),
        unit=data.get("unit", 1),
        topic=data.get("topic", "General"),
        question_text=data.get("question_text", "").strip(),
        marks=data.get("marks", 2),
        question_type=data.get("question_type", "Short Answer"),
        difficulty=data.get("difficulty", "Medium"),
        blooms_level=data.get("blooms_level", "Understand"),
        course_outcome=data.get("course_outcome", "CO1"),
        sample_answer=data.get("sample_answer", ""),
        rubric_json=data.get("rubric_json", ""),
        is_ai_generated=False
    )
    if not new_q.question_text:
        raise HTTPException(status_code=400, detail="Question text is required")

    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return {"success": True, "id": new_q.id, "question": new_q.question_text}

@app.put("/api/questions/{q_id}")
def update_question(q_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if "question_text" in data:
        q.question_text = data["question_text"]
    if "marks" in data:
        q.marks = int(data["marks"])
    if "unit" in data:
        q.unit = int(data["unit"])
    if "topic" in data:
        q.topic = data["topic"]
    if "difficulty" in data:
        q.difficulty = data["difficulty"]
    if "blooms_level" in data:
        q.blooms_level = data["blooms_level"]
    if "course_outcome" in data:
        q.course_outcome = data["course_outcome"]
    if "question_type" in data:
        q.question_type = data["question_type"]
    if "sample_answer" in data:
        q.sample_answer = data["sample_answer"]

    db.commit()
    return {"success": True, "message": "Question updated successfully"}

@app.delete("/api/questions/{q_id}")
def delete_question(q_id: int, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()
    return {"success": True, "message": "Question deleted successfully"}

# -------------------------------------------------------------
# 5. TEMPLATES
# -------------------------------------------------------------
@app.get("/api/templates")
def get_templates(subject_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(QuestionPaperTemplate)
    if subject_id:
        query = query.filter(QuestionPaperTemplate.subject_id == subject_id)
    tmpls = query.all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "subject_id": t.subject_id,
            "total_marks": t.total_marks,
            "duration_minutes": t.duration_minutes,
            "institution_name": t.institution_name,
            "department_name": t.department_name,
            "exam_title": t.exam_title,
            "instructions": t.instructions,
            "sections_config": json.loads(t.sections_config) if t.sections_config else []
        }
        for t in tmpls
    ]

# -------------------------------------------------------------
# 6. QUESTION PAPER GENERATION WIZARD
# -------------------------------------------------------------
@app.post("/api/papers/generate")
def generate_question_paper(payload: Dict[str, Any], db: Session = Depends(get_db)):
    subject_id = payload.get("subject_id")
    selected_units = payload.get("selected_units", [1, 2, 3, 4, 5])
    mode = payload.get("generation_mode", "bank") # 'bank' or 'ai'
    diff_mix = payload.get("difficulty_distribution", {"Easy": 30, "Medium": 50, "Hard": 20})

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Determine template
    template_id = payload.get("template_id")
    template_config = None
    if template_id:
        tmpl = db.query(QuestionPaperTemplate).filter(QuestionPaperTemplate.id == template_id).first()
        if tmpl and tmpl.sections_config:
            template_config = {
                "institution_name": tmpl.institution_name,
                "department_name": tmpl.department_name,
                "duration_minutes": tmpl.duration_minutes,
                "instructions": tmpl.instructions,
                "sections": json.loads(tmpl.sections_config)
            }

    if not template_config:
        # Check custom sections in payload
        if payload.get("custom_sections"):
            template_config = {
                "institution_name": payload.get("institution_name", "NATIONAL INSTITUTE OF TECHNOLOGY"),
                "department_name": payload.get("department_name", f"DEPARTMENT OF {subject.department.upper()}"),
                "duration_minutes": payload.get("duration_minutes", 180),
                "instructions": payload.get("instructions", "Answer ALL Questions. Figures to the right indicate full marks."),
                "sections": payload.get("custom_sections")
            }
        else:
            # Fallback to Anna University default
            first_tmpl = db.query(QuestionPaperTemplate).first()
            template_config = {
                "institution_name": first_tmpl.institution_name if first_tmpl else "NATIONAL INSTITUTE OF TECHNOLOGY",
                "department_name": first_tmpl.department_name if first_tmpl else "DEPARTMENT OF COMPUTER SCIENCE",
                "duration_minutes": first_tmpl.duration_minutes if first_tmpl else 180,
                "instructions": first_tmpl.instructions if first_tmpl else "Answer ALL Questions.",
                "sections": json.loads(first_tmpl.sections_config) if first_tmpl and first_tmpl.sections_config else []
            }

    # Run AI Assembly Engine
    assembled = AIEngine.generate_paper(
        db=db,
        subject_id=subject_id,
        selected_units=selected_units,
        template_config=template_config,
        mode=mode,
        difficulty_mix=diff_mix
    )

    # Persist in Database
    exam_paper = GeneratedPaper(
        title=f"{subject.name} Examination Paper",
        subject_id=subject_id,
        template_id=template_id,
        exam_code=assembled["exam_code"],
        academic_year="2025-2026",
        semester=f"Semester {subject.semester}",
        date_str="November 2026",
        duration_minutes=assembled["duration_minutes"],
        total_marks=assembled["total_marks"],
        institution_name=assembled["institution_name"],
        department_name=assembled["department_name"],
        instructions=assembled["instructions"],
        status="finalized",
        generation_mode=mode,
        difficulty_easy_pct=diff_mix.get("Easy", 30),
        difficulty_medium_pct=diff_mix.get("Medium", 50),
        difficulty_hard_pct=diff_mix.get("Hard", 20)
    )
    db.add(exam_paper)
    db.commit()
    db.refresh(exam_paper)

    # Persist Sections and Questions
    for s_data in assembled["sections"]:
        sec_obj = PaperSection(
            paper_id=exam_paper.id,
            section_name=s_data["section_name"],
            section_title=s_data["section_title"],
            instructions=s_data["instructions"],
            total_questions_to_answer=s_data["total_questions_to_answer"],
            total_questions=s_data["total_questions"],
            marks_per_question=s_data["marks_per_question"],
            section_order=s_data["section_order"]
        )
        db.add(sec_obj)
        db.commit()
        db.refresh(sec_obj)

        for q_data in s_data["questions"]:
            pq_obj = PaperQuestion(
                section_id=sec_obj.id,
                paper_id=exam_paper.id,
                question_id=q_data.get("question_id"),
                question_number=q_data.get("question_number", 1),
                sub_part=q_data.get("sub_part"),
                is_or_choice=q_data.get("is_or_choice", False),
                or_group_id=q_data.get("or_group_id"),
                choice_side=q_data.get("choice_side"),
                question_text=q_data.get("question_text"),
                marks=q_data.get("marks", 2),
                difficulty=q_data.get("difficulty", "Medium"),
                blooms_level=q_data.get("blooms_level", "Understand"),
                course_outcome=q_data.get("course_outcome", "CO1"),
                unit=q_data.get("unit", 1),
                topic=q_data.get("topic", "Concepts"),
                question_order=q_data.get("question_order", 1),
                sample_answer=q_data.get("sample_answer"),
                rubric_text=q_data.get("rubric_text")
            )
            db.add(pq_obj)

    db.commit()
    return {"success": True, "paper_id": exam_paper.id, "message": "Question paper generated successfully."}

# -------------------------------------------------------------
# 7. INTERACTIVE QUESTION PAPER EDITOR
# -------------------------------------------------------------
@app.get("/api/papers")
def list_generated_papers(db: Session = Depends(get_db)):
    papers = db.query(GeneratedPaper).order_by(GeneratedPaper.updated_at.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "subject_id": p.subject_id,
            "subject_code": p.subject.code if p.subject else "",
            "subject_name": p.subject.name if p.subject else "",
            "exam_code": p.exam_code,
            "total_marks": p.total_marks,
            "duration_minutes": p.duration_minutes,
            "generation_mode": p.generation_mode,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat() if p.updated_at else p.created_at.isoformat()
        }
        for p in papers
    ]

@app.get("/api/papers/{paper_id}")
def get_paper_details(paper_id: int, db: Session = Depends(get_db)):
    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    sections_res = []
    for s in paper.sections:
        questions_res = []
        for q in s.questions:
            questions_res.append({
                "id": q.id,
                "section_id": q.section_id,
                "question_id": q.question_id,
                "question_number": q.question_number,
                "sub_part": q.sub_part,
                "is_or_choice": q.is_or_choice,
                "or_group_id": q.or_group_id,
                "choice_side": q.choice_side,
                "question_text": q.question_text,
                "marks": q.marks,
                "difficulty": q.difficulty,
                "blooms_level": q.blooms_level,
                "course_outcome": q.course_outcome,
                "unit": q.unit,
                "topic": q.topic,
                "question_order": q.question_order,
                "sample_answer": q.sample_answer,
                "rubric_text": q.rubric_text
            })

        sections_res.append({
            "id": s.id,
            "section_name": s.section_name,
            "section_title": s.section_title,
            "instructions": s.instructions,
            "total_questions_to_answer": s.total_questions_to_answer,
            "total_questions": s.total_questions,
            "marks_per_question": s.marks_per_question,
            "section_order": s.section_order,
            "questions": sorted(questions_res, key=lambda x: x["question_order"])
        })

    return {
        "id": paper.id,
        "title": paper.title,
        "subject_id": paper.subject_id,
        "subject_name": paper.subject.name if paper.subject else "",
        "subject_code": paper.subject.code if paper.subject else "",
        "exam_code": paper.exam_code,
        "academic_year": paper.academic_year,
        "semester": paper.semester,
        "date_str": paper.date_str,
        "duration_minutes": paper.duration_minutes,
        "total_marks": paper.total_marks,
        "institution_name": paper.institution_name,
        "department_name": paper.department_name,
        "instructions": paper.instructions,
        "status": paper.status,
        "generation_mode": paper.generation_mode,
        "sections": sorted(sections_res, key=lambda x: x["section_order"])
    }

@app.put("/api/papers/{paper_id}/update")
def update_paper(paper_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Update metadata
    if "title" in payload:
        paper.title = payload["title"]
    if "institution_name" in payload:
        paper.institution_name = payload["institution_name"]
    if "department_name" in payload:
        paper.department_name = payload["department_name"]
    if "exam_code" in payload:
        paper.exam_code = payload["exam_code"]
    if "duration_minutes" in payload:
        paper.duration_minutes = int(payload["duration_minutes"])
    if "instructions" in payload:
        paper.instructions = payload["instructions"]
    if "total_marks" in payload:
        paper.total_marks = int(payload["total_marks"])

    # If full sections with questions provided, update them
    if "sections" in payload:
        for sec_data in payload["sections"]:
            sec_id = sec_data.get("id")
            sec_obj = db.query(PaperSection).filter(PaperSection.id == sec_id).first()
            if sec_obj:
                if "section_name" in sec_data:
                    sec_obj.section_name = sec_data["section_name"]
                if "instructions" in sec_data:
                    sec_obj.instructions = sec_data["instructions"]

                for q_data in sec_data.get("questions", []):
                    qid = q_data.get("id")
                    q_obj = db.query(PaperQuestion).filter(PaperQuestion.id == qid).first()
                    if q_obj:
                        q_obj.question_text = q_data.get("question_text", q_obj.question_text)
                        q_obj.marks = int(q_data.get("marks", q_obj.marks))
                        q_obj.difficulty = q_data.get("difficulty", q_obj.difficulty)
                        q_obj.blooms_level = q_data.get("blooms_level", q_obj.blooms_level)
                        q_obj.course_outcome = q_data.get("course_outcome", q_obj.course_outcome)
                        q_obj.unit = int(q_data.get("unit", q_obj.unit))
                        q_obj.topic = q_data.get("topic", q_obj.topic)
                        q_obj.question_number = int(q_data.get("question_number", q_obj.question_number))
                        q_obj.question_order = int(q_data.get("question_order", q_obj.question_order))

        # Recalculate total paper marks
        all_paper_qs = db.query(PaperQuestion).filter(PaperQuestion.paper_id == paper_id).all()
        # For either/or questions, count only one side's marks per or_group_id
        counted_or_groups = set()
        calc_total = 0
        for pq in all_paper_qs:
            if pq.is_or_choice and pq.or_group_id:
                if pq.or_group_id not in counted_or_groups:
                    calc_total += pq.marks
                    counted_or_groups.add(pq.or_group_id)
            else:
                calc_total += pq.marks
        paper.total_marks = calc_total

    db.commit()
    return {"success": True, "message": "Paper updated successfully", "total_marks": paper.total_marks}

@app.put("/api/papers/{paper_id}/questions/{pq_id}")
def update_paper_question(paper_id: int, pq_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == pq_id, PaperQuestion.paper_id == paper_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question not found")

    if "question_text" in data:
        pq.question_text = data["question_text"]
    if "marks" in data:
        pq.marks = int(data["marks"])
    if "difficulty" in data:
        pq.difficulty = data["difficulty"]
    if "blooms_level" in data:
        pq.blooms_level = data["blooms_level"]
    if "course_outcome" in data:
        pq.course_outcome = data["course_outcome"]
    if "topic" in data:
        pq.topic = data["topic"]
    if "unit" in data:
        pq.unit = int(data["unit"])
    if "sample_answer" in data:
        pq.sample_answer = data["sample_answer"]

    db.commit()
    return {"success": True, "message": "Question updated"}

@app.delete("/api/papers/{paper_id}/questions/{pq_id}")
def delete_paper_question(paper_id: int, pq_id: int, db: Session = Depends(get_db)):
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == pq_id, PaperQuestion.paper_id == paper_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question not found")
    db.delete(pq)
    db.commit()
    return {"success": True, "message": "Question removed from paper"}

@app.post("/api/papers/{paper_id}/sections/{section_id}/add-question")
def add_question_to_section(paper_id: int, section_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    section = db.query(PaperSection).filter(PaperSection.id == section_id, PaperSection.paper_id == paper_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    max_order = db.query(func.max(PaperQuestion.question_order)).filter(PaperQuestion.section_id == section_id).scalar() or 0
    max_num = db.query(func.max(PaperQuestion.question_number)).filter(PaperQuestion.paper_id == paper_id).scalar() or 0

    new_pq = PaperQuestion(
        section_id=section_id,
        paper_id=paper_id,
        question_id=payload.get("question_id"),
        question_number=max_num + 1,
        sub_part=None,
        is_or_choice=False,
        question_text=payload.get("question_text", "New Question"),
        marks=payload.get("marks", section.marks_per_question),
        difficulty=payload.get("difficulty", "Medium"),
        blooms_level=payload.get("blooms_level", "Understand"),
        course_outcome=payload.get("course_outcome", "CO1"),
        unit=payload.get("unit", 1),
        topic=payload.get("topic", "Core Concepts"),
        question_order=max_order + 1,
        sample_answer=payload.get("sample_answer", "Model answer"),
        rubric_text=payload.get("rubric_text", "Marking rubric")
    )
    db.add(new_pq)
    db.commit()
    db.refresh(new_pq)
    return {"success": True, "id": new_pq.id, "question_number": new_pq.question_number}

@app.get("/api/papers/{paper_id}/questions/{pq_id}/alternatives")
def get_question_alternatives(paper_id: int, pq_id: int, db: Session = Depends(get_db)):
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == pq_id, PaperQuestion.paper_id == paper_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question not found")

    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    alternatives = AIEngine.get_alternatives(
        db=db,
        subject_id=paper.subject_id,
        unit=pq.unit,
        marks=pq.marks,
        exclude_id=pq.question_id
    )
    return alternatives

@app.post("/api/papers/{paper_id}/questions/{pq_id}/replace")
def replace_paper_question(paper_id: int, pq_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == pq_id, PaperQuestion.paper_id == paper_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question not found")

    replacement_id = payload.get("replacement_question_id")
    replacement_q = db.query(Question).filter(Question.id == replacement_id).first()
    if not replacement_q:
        raise HTTPException(status_code=404, detail="Replacement question not found in bank")

    pq.question_id = replacement_q.id
    pq.question_text = replacement_q.question_text
    pq.marks = replacement_q.marks
    pq.difficulty = replacement_q.difficulty
    pq.blooms_level = replacement_q.blooms_level
    pq.course_outcome = replacement_q.course_outcome
    pq.unit = replacement_q.unit
    pq.topic = replacement_q.topic
    pq.sample_answer = replacement_q.sample_answer
    pq.rubric_text = replacement_q.rubric_json

    db.commit()
    return {"success": True, "message": "Question replaced successfully", "question_text": pq.question_text}

@app.post("/api/papers/{paper_id}/questions/{pq_id}/regenerate")
def regenerate_paper_question(paper_id: int, pq_id: int, db: Session = Depends(get_db)):
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == pq_id, PaperQuestion.paper_id == paper_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Paper question not found")

    paper = db.query(GeneratedPaper).filter(GeneratedPaper.id == paper_id).first()
    subject_name = paper.subject.name if paper.subject else "Engineering"

    # Synthesize new question
    synth = AIEngine.synthesize_question(
        topic=pq.topic or f"{subject_name} Unit {pq.unit} Applications",
        unit=pq.unit,
        marks=pq.marks,
        difficulty=pq.difficulty,
        blooms_level=pq.blooms_level,
        course_outcome=pq.course_outcome
    )

    pq.question_text = synth["question_text"]
    pq.sample_answer = synth["sample_answer"]
    pq.rubric_text = synth["rubric_text"]
    pq.question_id = None # newly synthesized

    db.commit()
    return {
        "success": True,
        "message": "Question regenerated using AI",
        "question_text": pq.question_text,
        "sample_answer": pq.sample_answer,
        "rubric_text": pq.rubric_text
    }

# -------------------------------------------------------------
# 8. EXPORT MODULE (PDF & DOCX)
# -------------------------------------------------------------
@app.get("/api/papers/{paper_id}/export/pdf")
def export_paper_pdf(paper_id: int, db: Session = Depends(get_db)):
    paper_dict = get_paper_details(paper_id, db)
    pdf_buffer = ExportService.generate_pdf(paper_dict)
    filename = f"{paper_dict['subject_code']}_Question_Paper_{paper_dict['exam_code']}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/papers/{paper_id}/export/docx")
def export_paper_docx(paper_id: int, db: Session = Depends(get_db)):
    paper_dict = get_paper_details(paper_id, db)
    docx_buffer = ExportService.generate_docx(paper_dict)
    filename = f"{paper_dict['subject_code']}_Question_Paper_{paper_dict['exam_code']}.docx"

    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# -------------------------------------------------------------
# 9. SETTINGS
# -------------------------------------------------------------
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_records = db.query(SystemSetting).all()
    s_dict = {s.key: s.value for s in settings_records}

    # API key configured status
    has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))

    return {
        "institution_name": s_dict.get("institution_name", "NATIONAL INSTITUTE OF TECHNOLOGY & HIGHER STUDIES"),
        "department_name": s_dict.get("department_name", "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING"),
        "demo_mode": s_dict.get("demo_mode", "true") == "true",
        "ai_provider": s_dict.get("ai_provider", "Hybrid (Offline Procedural + LLM)"),
        "has_gemini_api_key": has_gemini,
        "has_openai_api_key": has_openai
    }

@app.post("/api/settings")
def save_settings(payload: Dict[str, Any], db: Session = Depends(get_db)):
    for key, val in payload.items():
        rec = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if rec:
            rec.value = str(val)
        else:
            db.add(SystemSetting(key=key, value=str(val)))
    db.commit()
    return {"success": True, "message": "Settings updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
