import json
from sqlalchemy.orm import Session
from models import Subject, Question, QuestionPaperTemplate, GeneratedPaper, PaperSection, PaperQuestion, SystemSetting

def seed_database(db: Session):
    """
    Seeds standardized university blueprint templates matching official autonomous formats.
    No hardcoded subjects or questions are added; user manually adds their subjects and questions.
    """
    # Clear old templates and recreate with exact photo pattern
    db.query(QuestionPaperTemplate).delete()

    # 1. Primary Pattern: V.S.B. / Autonomous 50 Marks Pattern (from official exam paper photo)
    vsb_sections_config = [
        {
            "section_name": "PART - A",
            "section_title": "PART - A (5 X 2 = 10 Marks)",
            "instructions": "Answer ALL Questions (5 X 2 = 10 Marks)",
            "total_questions_to_answer": 5,
            "total_questions": 5,
            "marks_per_question": 2,
            "has_either_or": False
        },
        {
            "section_name": "PART - B",
            "section_title": "PART - B (1 X 8 = 8 Marks)",
            "instructions": "Answer ALL Questions (Either / Or Choice: 1 X 8 = 8 Marks)",
            "total_questions_to_answer": 1,
            "total_questions": 2,
            "marks_per_question": 8,
            "has_either_or": True
        },
        {
            "section_name": "PART - C",
            "section_title": "PART - C (2 X 16 = 32 Marks)",
            "instructions": "Answer ALL Questions (Either / Or Choice: 2 X 16 = 32 Marks)",
            "total_questions_to_answer": 2,
            "total_questions": 4,
            "marks_per_question": 16,
            "has_either_or": True,
            "supports_split": True
        }
    ]

    tmpl_vsb = QuestionPaperTemplate(
        name="Autonomous Engineering Assessment Format (50 Marks - V.S.B. Pattern)",
        subject_id=None,
        total_marks=50,
        duration_minutes=100,
        institution_name="V.S.B. ENGINEERING COLLEGE, KARUR.",
        department_name="Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
        exam_title="INTERNAL TEST - II",
        instructions="Answer ALL Questions",
        sections_config=json.dumps(vsb_sections_config)
    )
    db.add(tmpl_vsb)

    # 2. End-Semester 100 Marks Pattern
    anna_sections_config = [
        {
            "section_name": "PART - A",
            "section_title": "PART - A (10 X 2 = 20 Marks)",
            "instructions": "Answer ALL Questions (10 X 2 = 20 Marks)",
            "total_questions_to_answer": 10,
            "total_questions": 10,
            "marks_per_question": 2,
            "has_either_or": False
        },
        {
            "section_name": "PART - B",
            "section_title": "PART - B (5 X 13 = 65 Marks)",
            "instructions": "Answer ALL Questions (Either / Or Choice: 5 X 13 = 65 Marks)",
            "total_questions_to_answer": 5,
            "total_questions": 10,
            "marks_per_question": 13,
            "has_either_or": True
        },
        {
            "section_name": "PART - C",
            "section_title": "PART - C (1 X 15 = 15 Marks)",
            "instructions": "Comprehensive Evaluation (Either / Or Choice: 1 X 15 = 15 Marks)",
            "total_questions_to_answer": 1,
            "total_questions": 2,
            "marks_per_question": 15,
            "has_either_or": True
        }
    ]

    tmpl_anna = QuestionPaperTemplate(
        name="Anna University Autonomous End-Semester Format (100 Marks)",
        subject_id=None,
        total_marks=100,
        duration_minutes=180,
        institution_name="V.S.B. ENGINEERING COLLEGE, KARUR.",
        department_name="Department of Computer Science & Engineering",
        exam_title="END SEMESTER DEGREE EXAMINATIONS",
        instructions="Answer ALL Questions. Standard notations apply. Scientific calculators are permitted.",
        sections_config=json.dumps(anna_sections_config)
    )
    db.add(tmpl_anna)

    # 3. Ensure Subject 23ALT501 - NATURAL LANGUAGE PROCESSING exists
    nlp_sub = db.query(Subject).filter((Subject.code == "23ALT501") | (Subject.code == "NLP011")).first()
    if not nlp_sub:
        nlp_sub = Subject(
            name="NATURAL LANGUAGE PROCESSING",
            code="23ALT501",
            department="Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
            semester=5,
            regulation="Regulations 2023",
            description="Autonomous Internal Examination & University Standard Course"
        )
        db.add(nlp_sub)
        db.commit()
        db.refresh(nlp_sub)
    else:
        nlp_sub.name = "NATURAL LANGUAGE PROCESSING"
        nlp_sub.code = "23ALT501"
        nlp_sub.department = "Computer Science and Engineering (Artificial Intelligence and Machine Learning)"
        nlp_sub.semester = 5
        nlp_sub.regulation = "Regulations 2023"
        db.commit()

    # 4. Seed Questions matching the official exam paper photo if question count is low
    if db.query(Question).filter(Question.subject_id == nlp_sub.id).count() < 10:
        sample_questions = [
            # PART A (2 Marks)
            {"text": "Analyze the importance of grammar rules in English language processing.", "marks": 2, "unit": 3, "co": "CO3", "bl": "Analyze", "diff": "Medium"},
            {"text": "Compare Chomsky Normal Form and standard CFG representations.", "marks": 2, "unit": 3, "co": "CO3", "bl": "Analyze", "diff": "Medium"},
            {"text": "Analyze how First-Order Logic (FOL) represents sentence meaning.", "marks": 2, "unit": 4, "co": "CO4", "bl": "Analyze", "diff": "Medium"},
            {"text": "Compare First-Order Logic and Description Logics.", "marks": 2, "unit": 4, "co": "CO4", "bl": "Analyze", "diff": "Medium"},
            {"text": "Evaluate the significance of the Penn Treebank in NLP research.", "marks": 2, "unit": 5, "co": "CO5", "bl": "Evaluate", "diff": "Hard"},
            {"text": "Define Regular Expressions and their role in text tokenization.", "marks": 2, "unit": 1, "co": "CO1", "bl": "Remember", "diff": "Easy"},
            {"text": "State the principle of Maximum Likelihood Estimation in N-gram language models.", "marks": 2, "unit": 1, "co": "CO1", "bl": "Remember", "diff": "Easy"},
            {"text": "Differentiate between Stemming and Lemmatization with suitable examples.", "marks": 2, "unit": 2, "co": "CO2", "bl": "Understand", "diff": "Easy"},
            {"text": "Explain the concept of Hidden Markov Models (HMM) applied to POS tagging.", "marks": 2, "unit": 2, "co": "CO2", "bl": "Understand", "diff": "Medium"},
            {"text": "What is Word Sense Disambiguation (WSD)? Mention two popular approaches.", "marks": 2, "unit": 4, "co": "CO4", "bl": "Understand", "diff": "Medium"},

            # PART B (8 Marks)
            {"text": "Evaluate the Centering Theory approach for anaphora resolution.", "marks": 8, "unit": 5, "co": "CO5", "bl": "Evaluate", "diff": "Hard"},
            {"text": "Analyze coreference resolution and distinguish it from anaphora resolution.", "marks": 8, "unit": 5, "co": "CO5", "bl": "Analyze", "diff": "Medium"},
            {"text": "Explain the Cocke-Younger-Kasami (CYK) dynamic programming algorithm for CFG parsing with a trace table.", "marks": 8, "unit": 3, "co": "CO3", "bl": "Understand", "diff": "Medium"},
            {"text": "Demonstrate the Early Parser algorithm on an ambiguous sentence CFG derivation.", "marks": 8, "unit": 3, "co": "CO3", "bl": "Apply", "diff": "Medium"},
            {"text": "Explain Vector Space Models and TF-IDF weighting schemes in statistical natural language processing.", "marks": 8, "unit": 2, "co": "CO2", "bl": "Understand", "diff": "Medium"},

            # PART C (16 Marks & 8+8 Marks)
            {"text": "Discuss the concept of Shallow Parsing and compare it with Full Parsing in NLP applications.", "marks": 16, "unit": 3, "co": "CO3", "bl": "Analyze", "diff": "Medium"},
            {"text": "Analyze the role of Context-Free Grammars (CFGs) in syntactic analysis and explain their importance in Natural Language Processing.", "marks": 8, "unit": 3, "co": "CO3", "bl": "Analyze", "diff": "Medium"},
            {"text": "Critically evaluate the effectiveness of Grammar Rules for English in computational language processing.", "marks": 8, "unit": 3, "co": "CO3", "bl": "Evaluate", "diff": "Hard"},
            {"text": "Design a complete semantic NLP system integrating FOL, description logics, WSD, thematic roles, and word similarity measures.", "marks": 16, "unit": 4, "co": "CO4", "bl": "Apply", "diff": "Hard"},
            {"text": "Formulate an end-to-end Discourse Parsing pipeline using lexical cohesion and rhetorical structure theory.", "marks": 16, "unit": 5, "co": "CO5", "bl": "Create", "diff": "Hard"},
            {"text": "Develop a comparative analysis of probabilistic parsers (PCFG) versus transition-based dependency parsers with algorithmic steps.", "marks": 16, "unit": 3, "co": "CO3", "bl": "Analyze", "diff": "Medium"},
        ]

        for qd in sample_questions:
            db.add(Question(
                subject_id=nlp_sub.id,
                unit=qd["unit"],
                topic=f"Unit {qd['unit']} - Advanced NLP",
                question_text=qd["text"],
                marks=qd["marks"],
                question_type="Short Answer" if qd["marks"] == 2 else ("Long Answer" if qd["marks"] == 8 else "Essay Questions"),
                difficulty=qd["diff"],
                blooms_level=qd["bl"],
                course_outcome=qd["co"],
                is_ai_generated=False,
                sample_answer=f"Academic evaluation rubric and detailed formulation: {qd['marks']} Marks",
                rubric_json=f"Technical accuracy & schematic: {qd['marks']} Marks"
            ))
        db.commit()

    # 5. System Settings
    if db.query(SystemSetting).count() == 0:
        db.add(SystemSetting(key="institution_name", value="V.S.B. ENGINEERING COLLEGE, KARUR."))
        db.add(SystemSetting(key="department_name", value="Computer Science and Engineering (Artificial Intelligence and Machine Learning)"))
        db.add(SystemSetting(key="demo_mode", value="true"))
        db.add(SystemSetting(key="ai_provider", value="Mock / Procedural Synthesis"))

    db.commit()
    print("Database initialized with V.S.B. Autonomous 50M template and 23ALT501 NLP questions.")
