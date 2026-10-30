import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    full_name = Column(String(150), default="Faculty Member")
    role = Column(String(50), default="Examiner") # Admin, Examiner, Faculty
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), default="Computer Science & Engineering")
    semester = Column(Integer, default=5)
    regulation = Column(String(50), default="Autonomous / Anna University 2023")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    documents = relationship("UploadedDocument", back_populates="subject", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")
    templates = relationship("QuestionPaperTemplate", back_populates="subject", cascade="all, delete-orphan")
    papers = relationship("GeneratedPaper", back_populates="subject", cascade="all, delete-orphan")

class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # pdf, docx, doc, txt, xlsx, xls
    file_size = Column(Integer, default=0) # in bytes
    doc_category = Column(String(50), default="question_bank") # question_bank, sample_paper, previous_paper, syllabus
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    status = Column(String(50), default="processed") # processing, processed, failed
    extracted_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    detected_metadata = Column(Text, nullable=True) # JSON of detected sample paper pattern or syllabus units
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="documents")
    questions = relationship("Question", back_populates="source_document")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    unit = Column(Integer, default=1, index=True)
    topic = Column(String(200), default="Core Concepts")
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, default=2) # 2, 8, 13, 15, 16, etc.
    question_type = Column(String(50), default="Short Answer") # MCQ, Very Short Answer, Short Answer, Long Answer, Essay, Programming
    difficulty = Column(String(50), default="Medium") # Easy, Medium, Hard
    blooms_level = Column(String(50), default="Understand") # Remember, Understand, Apply, Analyze, Evaluate, Create
    course_outcome = Column(String(20), default="CO1") # CO1, CO2, CO3, CO4, CO5
    source_doc_id = Column(Integer, ForeignKey("uploaded_documents.id"), nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    sample_answer = Column(Text, nullable=True)
    rubric_json = Column(Text, nullable=True) # JSON evaluation rubric
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="questions")
    source_document = relationship("UploadedDocument", back_populates="questions")

class QuestionPaperTemplate(Base):
    __tablename__ = "question_paper_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    total_marks = Column(Integer, default=100)
    duration_minutes = Column(Integer, default=180) # 180 min = 3 hours
    institution_name = Column(String(255), default="NATIONAL INSTITUTE OF TECHNOLOGY & HIGHER STUDIES")
    department_name = Column(String(255), default="DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING")
    exam_title = Column(String(255), default="END SEMESTER DEGREE EXAMINATIONS")
    instructions = Column(Text, default="Answer ALL Questions. Figures to the right indicate full marks. Assume suitable data if necessary.")
    sections_config = Column(Text, nullable=False) # JSON array of section blueprints
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="templates")

class GeneratedPaper(Base):
    __tablename__ = "generated_papers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("question_paper_templates.id"), nullable=True)
    exam_code = Column(String(50), default="QP-2026-CS501")
    academic_year = Column(String(50), default="2025-2026")
    semester = Column(String(50), default="Fifth Semester")
    date_str = Column(String(50), default="November 2026")
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Integer, default=100)
    institution_name = Column(String(255), default="NATIONAL INSTITUTE OF TECHNOLOGY & HIGHER STUDIES")
    department_name = Column(String(255), default="DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING")
    instructions = Column(Text, default="Answer ALL Questions. Standard notations apply. Scientific calculators are permitted.")
    status = Column(String(50), default="finalized") # draft, finalized
    generation_mode = Column(String(50), default="bank") # bank (Question Bank Mode), ai (AI Generation Mode)
    difficulty_easy_pct = Column(Integer, default=30)
    difficulty_medium_pct = Column(Integer, default=50)
    difficulty_hard_pct = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    subject = relationship("Subject", back_populates="papers")
    sections = relationship("PaperSection", back_populates="paper", cascade="all, delete-orphan", order_by="PaperSection.section_order")

class PaperSection(Base):
    __tablename__ = "paper_sections"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("generated_papers.id"), nullable=False)
    section_name = Column(String(50), default="PART - A") # PART - A, PART - B, PART - C
    section_title = Column(String(255), default="Short Answer Questions")
    instructions = Column(String(255), default="Answer ALL questions (5 x 2 = 10 Marks)")
    total_questions_to_answer = Column(Integer, default=5)
    total_questions = Column(Integer, default=5)
    marks_per_question = Column(Integer, default=2)
    section_order = Column(Integer, default=1)

    # Relationships
    paper = relationship("GeneratedPaper", back_populates="sections")
    questions = relationship("PaperQuestion", back_populates="section", cascade="all, delete-orphan", order_by="PaperQuestion.question_order")

class PaperQuestion(Base):
    __tablename__ = "paper_questions"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("paper_sections.id"), nullable=False)
    paper_id = Column(Integer, ForeignKey("generated_papers.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=True) # original question reference
    question_number = Column(Integer, default=1)
    sub_part = Column(String(10), nullable=True) # (a), (b), (i), (ii)
    is_or_choice = Column(Boolean, default=False) # true if part of an OR pair
    or_group_id = Column(String(50), nullable=True) # groups either/or questions (e.g. "Q11_OR")
    choice_side = Column(String(10), nullable=True) # "A" or "B" for Either / Or
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, default=2)
    difficulty = Column(String(50), default="Medium")
    blooms_level = Column(String(50), default="Understand")
    course_outcome = Column(String(20), default="CO1")
    unit = Column(Integer, default=1)
    topic = Column(String(200), default="Core Concepts")
    question_order = Column(Integer, default=1)
    sample_answer = Column(Text, nullable=True)
    rubric_text = Column(Text, nullable=True)

    # Relationships
    section = relationship("PaperSection", back_populates="questions")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
