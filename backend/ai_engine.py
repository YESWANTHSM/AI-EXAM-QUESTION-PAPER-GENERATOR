import os
import random
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Question, PaperQuestion, Subject, UploadedDocument

# Technical procedural synthesis templates by cognitive tier and marks
PROCEDURAL_TEMPLATES = {
    "Easy": {
        2: [
            "Define {topic} and mention two key characteristics.",
            "State the fundamental principle underlying {topic}.",
            "List any four advantages of using {topic}.",
            "Differentiate between {topic} and its basic traditional counterpart.",
            "Identify the key components involved in {topic}.",
            "Write the mathematical or logical formulation for {topic}."
        ],
        8: [
            "Explain the basic architectural model of {topic} with a suitable schematic.",
            "Describe the classification and operational principles of {topic}.",
            "Discuss the lifecycle and step-by-step phases of {topic}."
        ],
        13: [
            "Elaborate on the foundational concepts, working mechanism, and practical significance of {topic}.",
            "Explain in detail the design principles and standard protocols associated with {topic}."
        ],
        15: [
            "Provide a comprehensive overview of {topic}, detailing its architecture, standards, and practical constraints.",
            "Discuss the evolution, theoretical foundations, and modern implementations of {topic}."
        ],
        16: [
            "Provide a comprehensive overview of {topic}, detailing its architecture, standards, and practical constraints.",
            "Discuss the evolution, theoretical foundations, and modern implementations of {topic}."
        ]
    },
    "Medium": {
        2: [
            "Illustrate how {topic} handles boundary conditions or exceptions.",
            "Compute the theoretical time or resource complexity of {topic}.",
            "Explain why {topic} is preferred over conventional alternatives in modern applications.",
            "How does {topic} maintain data integrity or system consistency?"
        ],
        8: [
            "Explain the algorithmic procedure of {topic} with an illustrative trace diagram.",
            "Compare and contrast {topic} with competing techniques under varying workload conditions.",
            "Demonstrate the practical implementation steps of {topic} with a relevant case scenario."
        ],
        13: [
            "Analyze the workflow and internal mechanism of {topic}. Formulate its performance metrics and explain each stage with diagrams.",
            "Design and explain an end-to-end framework leveraging {topic} to optimize processing efficiency."
        ],
        15: [
            "Critically analyze the operational behavior of {topic} under stress conditions. Provide formal equations, schematics, and evaluation benchmarks.",
            "Develop a comprehensive comparative study between {topic} and state-of-the-art frameworks, highlighting trade-offs."
        ],
        16: [
            "Critically analyze the operational behavior of {topic} under stress conditions. Provide formal equations, schematics, and evaluation benchmarks.",
            "Develop a comprehensive comparative study between {topic} and state-of-the-art frameworks, highlighting trade-offs."
        ]
    },
    "Hard": {
        2: [
            "Critically assess the failure modes or security vulnerabilities associated with {topic}.",
            "Formulate the optimal invariant condition for {topic} in distributed systems."
        ],
        8: [
            "Analyze the theoretical limitations of {topic} and propose an optimization strategy to minimize overhead.",
            "Formulate the mathematical proof or derivation governing the behavior of {topic}."
        ],
        13: [
            "Design a resilient, fault-tolerant architecture using {topic}. Detail the concurrency controls, failure recovery routines, and verification steps.",
            "Derive the exact formal model for {topic} and validate its correctness against adversarial scenarios."
        ],
        15: [
            "Case Study: Formulate an enterprise-grade autonomous system integrating {topic}. Propose the complete architectural blueprints, data pipelines, failure containment mechanisms, and evaluation rubrics.",
            "Critically evaluate the performance bottlenecks in {topic}. Propose an innovative heuristic or mathematical modification that proves higher asymptotic efficiency."
        ],
        16: [
            "Case Study: Formulate an enterprise-grade autonomous system integrating {topic}. Propose the complete architectural blueprints, data pipelines, failure containment mechanisms, and evaluation rubrics.",
            "Critically evaluate the performance bottlenecks in {topic}. Propose an innovative heuristic or mathematical modification that proves higher asymptotic efficiency."
        ]
    }
}

class AIEngine:
    """Intelligent Question Paper Assembly and Synthesis Engine."""

    @staticmethod
    def get_api_key() -> Optional[str]:
        return os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or None

    @staticmethod
    def synthesize_question(
        topic: str,
        unit: int,
        marks: int,
        difficulty: str = "Medium",
        blooms_level: str = "Apply",
        course_outcome: str = "CO1"
    ) -> Dict[str, Any]:
        """Synthesizes a university-standard question with rubrics and answer key."""
        diff = difficulty if difficulty in PROCEDURAL_TEMPLATES else "Medium"
        marks_key = marks if marks in PROCEDURAL_TEMPLATES[diff] else (2 if marks <= 2 else (8 if marks <= 10 else 13))

        templates = PROCEDURAL_TEMPLATES[diff].get(marks_key, PROCEDURAL_TEMPLATES["Medium"][2])
        chosen_template = random.choice(templates)
        question_text = chosen_template.format(topic=topic)

        # Build marking rubric
        if marks <= 2:
            rubric = f"Definition / Key statement: 1 Mark; Correct formulation or example: 1 Mark"
            sample_ans = f"Standard academic definition of {topic} with fundamental properties and relevant notation."
        elif marks <= 8:
            rubric = f"Conceptual framework & schematic: 3 Marks; Working mechanism & analysis: 3 Marks; Examples / Derivation: 2 Marks"
            sample_ans = f"Comprehensive explanation of {topic} including schematic diagrams, step-by-step workflow, and validation equations."
        else:
            rubric = f"System Architecture & Block Diagram: 4 Marks; Mathematical formulation / Algorithmic trace: 5 Marks; Performance analysis & Case discussion: {marks - 9} Marks"
            sample_ans = f"Full architectural and analytical synthesis of {topic} covering formal definitions, structural diagrams, step-by-step execution, and benchmark outcomes."

        return {
            "question_text": question_text,
            "marks": marks,
            "unit": unit,
            "topic": topic,
            "difficulty": diff,
            "blooms_level": blooms_level,
            "course_outcome": course_outcome,
            "question_type": "Short Answer" if marks <= 2 else ("Long Answer" if marks <= 8 else "Essay Questions"),
            "sample_answer": sample_ans,
            "rubric_text": rubric,
            "is_ai_generated": True
        }

    @staticmethod
    def generate_paper(
        db: Session,
        subject_id: int,
        selected_units: List[int],
        template_config: Dict[str, Any],
        mode: str = "bank", # 'bank' or 'ai'
        difficulty_mix: Dict[str, int] = None # e.g. {"Easy": 30, "Medium": 50, "Hard": 20}
    ) -> Dict[str, Any]:
        """
        Assembles question paper strictly obeying blueprint sections, units distribution, and either/or choices.
        """
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise ValueError(f"Subject with ID {subject_id} not found.")

        # Default difficulty distribution
        diff_mix = difficulty_mix or {"Easy": 30, "Medium": 50, "Hard": 20}

        # Query available questions for subject
        all_questions = db.query(Question).filter(
            Question.subject_id == subject_id,
            Question.unit.in_(selected_units)
        ).all()

        sections_cfg = template_config.get("sections", [])
        if not sections_cfg:
            raise ValueError("Template configuration must specify at least one section.")

        # Prepare paper structure
        generated_sections = []
        global_q_num = 1
        used_q_ids = set()

        for s_idx, sec in enumerate(sections_cfg):
            sec_name = sec.get("section_name", f"PART - {chr(65 + s_idx)}")
            sec_title = sec.get("section_title", f"{sec_name}")
            instructions = sec.get("instructions", "Answer all questions")
            questions_to_answer = sec.get("total_questions_to_answer", 5)
            has_either_or = sec.get("has_either_or", False)
            marks_per_q = sec.get("marks_per_question", 2)

            section_data = {
                "section_name": sec_name,
                "section_title": sec_title,
                "instructions": instructions,
                "total_questions_to_answer": questions_to_answer,
                "total_questions": questions_to_answer * 2 if has_either_or else questions_to_answer,
                "marks_per_question": marks_per_q,
                "section_order": s_idx + 1,
                "questions": []
            }

            # Distribute questions evenly across selected units
            unit_cycle = [u for u in selected_units]
            if not unit_cycle:
                unit_cycle = [1, 2, 3, 4, 5]

            for item_idx in range(questions_to_answer):
                target_unit = unit_cycle[item_idx % len(unit_cycle)]
                target_diff = "Easy" if item_idx % 3 == 0 else ("Hard" if item_idx % 4 == 0 else "Medium")

                if has_either_or:
                    # Choice A and Choice B (centered 'OR')
                    or_group = f"Q{global_q_num}_OR"

                    # Option A
                    q_a = AIEngine._pick_or_synthesize_question(
                        db=db,
                        subject=subject,
                        unit=target_unit,
                        marks=marks_per_q,
                        difficulty=target_diff,
                        preferred_blooms="Apply" if marks_per_q >= 8 else "Understand",
                        used_ids=used_q_ids,
                        mode=mode,
                        available_qs=all_questions
                    )
                    if "id" in q_a and q_a["id"]:
                        used_q_ids.add(q_a["id"])

                    q_a["question_number"] = global_q_num
                    q_a["sub_part"] = "(a)"
                    q_a["is_or_choice"] = True
                    q_a["or_group_id"] = or_group
                    q_a["choice_side"] = "A"
                    q_a["question_order"] = len(section_data["questions"]) + 1
                    section_data["questions"].append(q_a)

                    # Option B
                    q_b = AIEngine._pick_or_synthesize_question(
                        db=db,
                        subject=subject,
                        unit=target_unit,
                        marks=marks_per_q,
                        difficulty=target_diff,
                        preferred_blooms="Analyze" if marks_per_q >= 8 else "Understand",
                        used_ids=used_q_ids,
                        mode=mode,
                        available_qs=all_questions
                    )
                    if "id" in q_b and q_b["id"]:
                        used_q_ids.add(q_b["id"])

                    q_b["question_number"] = global_q_num
                    q_b["sub_part"] = "(b)"
                    q_b["is_or_choice"] = True
                    q_b["or_group_id"] = or_group
                    q_b["choice_side"] = "B"
                    q_b["question_order"] = len(section_data["questions"]) + 1
                    section_data["questions"].append(q_b)

                else:
                    # Single mandatory question
                    q = AIEngine._pick_or_synthesize_question(
                        db=db,
                        subject=subject,
                        unit=target_unit,
                        marks=marks_per_q,
                        difficulty=target_diff,
                        preferred_blooms="Remember" if marks_per_q <= 2 else "Understand",
                        used_ids=used_q_ids,
                        mode=mode,
                        available_qs=all_questions
                    )
                    if "id" in q and q["id"]:
                        used_q_ids.add(q["id"])

                    q["question_number"] = global_q_num
                    q["sub_part"] = None
                    q["is_or_choice"] = False
                    q["or_group_id"] = None
                    q["choice_side"] = None
                    q["question_order"] = len(section_data["questions"]) + 1
                    section_data["questions"].append(q)

                global_q_num += 1

            generated_sections.append(section_data)

        # Compute total marks
        total_paper_marks = sum(s["total_questions_to_answer"] * s["marks_per_question"] for s in generated_sections)

        return {
            "title": f"{subject.name} Examination Paper",
            "subject_id": subject.id,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "exam_code": f"QP-{subject.code}-2026",
            "duration_minutes": template_config.get("duration_minutes", 180),
            "total_marks": total_paper_marks,
            "institution_name": template_config.get("institution_name", "NATIONAL INSTITUTE OF TECHNOLOGY & HIGHER STUDIES"),
            "department_name": template_config.get("department_name", f"DEPARTMENT OF {subject.department.upper()}"),
            "instructions": template_config.get("instructions", "Answer ALL Questions. Figures to the right indicate full marks."),
            "generation_mode": mode,
            "sections": generated_sections
        }

    @staticmethod
    def _pick_or_synthesize_question(
        db: Session,
        subject: Subject,
        unit: int,
        marks: int,
        difficulty: str,
        preferred_blooms: str,
        used_ids: set,
        mode: str,
        available_qs: List[Question]
    ) -> Dict[str, Any]:
        """Finds matching question from question bank or synthesizes via AI."""
        # Filter candidate pool
        candidates = [
            q for q in available_qs
            if q.id not in used_ids
            and q.marks == marks
            and q.unit == unit
        ]

        # Prioritize matching difficulty if available
        diff_matches = [q for q in candidates if q.difficulty.lower() == difficulty.lower()]
        if diff_matches:
            chosen = random.choice(diff_matches)
            return {
                "question_id": chosen.id,
                "question_text": chosen.question_text,
                "marks": chosen.marks,
                "unit": chosen.unit,
                "topic": chosen.topic,
                "difficulty": chosen.difficulty,
                "blooms_level": chosen.blooms_level,
                "course_outcome": chosen.course_outcome,
                "question_type": chosen.question_type,
                "sample_answer": chosen.sample_answer or "Academic model solution.",
                "rubric_text": chosen.rubric_json or f"Standard evaluation: {marks} Marks",
                "is_ai_generated": False
            }

        # Any mark match in unit
        if candidates:
            chosen = random.choice(candidates)
            return {
                "question_id": chosen.id,
                "question_text": chosen.question_text,
                "marks": chosen.marks,
                "unit": chosen.unit,
                "topic": chosen.topic,
                "difficulty": chosen.difficulty,
                "blooms_level": chosen.blooms_level,
                "course_outcome": chosen.course_outcome,
                "question_type": chosen.question_type,
                "sample_answer": chosen.sample_answer or "Academic model solution.",
                "rubric_text": chosen.rubric_json or f"Standard evaluation: {marks} Marks",
                "is_ai_generated": False
            }

        # If in Question Bank Mode and no exact unit match, find any unused question with same marks
        if mode == "bank":
            fallback_same_marks = [q for q in available_qs if q.id not in used_ids and q.marks == marks]
            if fallback_same_marks:
                chosen = random.choice(fallback_same_marks)
                return {
                    "question_id": chosen.id,
                    "question_text": chosen.question_text,
                    "marks": chosen.marks,
                    "unit": chosen.unit,
                    "topic": chosen.topic,
                    "difficulty": chosen.difficulty,
                    "blooms_level": chosen.blooms_level,
                    "course_outcome": chosen.course_outcome,
                    "question_type": chosen.question_type,
                    "sample_answer": chosen.sample_answer or "Academic model solution.",
                    "rubric_text": chosen.rubric_json or f"Standard evaluation: {marks} Marks",
                    "is_ai_generated": False
                }

        # Otherwise synthesize technical procedural question
        unit_topics = {
            1: f"{subject.name} Fundamentals & Theoretical Foundations",
            2: f"{subject.name} Core Architecture & Methodologies",
            3: f"{subject.name} Algorithmic Processing & Analysis",
            4: f"{subject.name} System Design & Integration",
            5: f"{subject.name} Advanced Applications & Case Studies"
        }
        topic = unit_topics.get(unit, f"Unit {unit} Advanced Systems")
        return AIEngine.synthesize_question(
            topic=topic,
            unit=unit,
            marks=marks,
            difficulty=difficulty,
            blooms_level=preferred_blooms,
            course_outcome=f"CO{unit}"
        )

    @staticmethod
    def get_alternatives(
        db: Session,
        subject_id: int,
        unit: int,
        marks: int,
        exclude_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves eligible replacement questions from question bank."""
        query = db.query(Question).filter(
            Question.subject_id == subject_id,
            Question.marks == marks
        )
        if unit:
            query = query.filter(Question.unit == unit)
        if exclude_id:
            query = query.filter(Question.id != exclude_id)

        questions = query.limit(15).all()
        return [
            {
                "id": q.id,
                "question_text": q.question_text,
                "marks": q.marks,
                "unit": q.unit,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "blooms_level": q.blooms_level,
                "course_outcome": q.course_outcome,
                "question_type": q.question_type,
                "sample_answer": q.sample_answer,
                "rubric_text": q.rubric_json
            }
            for q in questions
        ]
