import os
import io
from typing import Dict, Any
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY, TA_LEFT
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

class ExportService:
    """Exports generated exam papers to university-standard PDF and DOCX formats."""

    @staticmethod
    def generate_pdf(paper_data: Dict[str, Any]) -> io.BytesIO:
        """Generates a pixel-perfect university examination question paper PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom Typography
        inst_style = ParagraphStyle(
            'InstitutionHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=2
        )

        dept_style = ParagraphStyle(
            'DeptHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2
        )

        exam_title_style = ParagraphStyle(
            'ExamTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        )

        meta_label_style = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0F172A')
        )

        meta_val_style = ParagraphStyle(
            'MetaVal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1E293B')
        )

        meta_val_right = ParagraphStyle(
            'MetaValRight',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            alignment=TA_RIGHT,
            textColor=colors.HexColor('#0F172A')
        )

        instructions_style = ParagraphStyle(
            'Instructions',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            leading=11,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#475569'),
            spaceAfter=8
        )

        section_hdr_style = ParagraphStyle(
            'SectionHdr',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10.5,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=8,
            spaceAfter=4
        )

        section_sub_style = ParagraphStyle(
            'SectionSub',
            parent=styles['Normal'],
            fontName='Helvetica-BoldOblique',
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )

        q_num_style = ParagraphStyle(
            'QNum',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#0F172A')
        )

        q_text_style = ParagraphStyle(
            'QText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12.5,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor('#0F172A')
        )

        q_tag_style = ParagraphStyle(
            'QTag',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            alignment=TA_RIGHT,
            textColor=colors.HexColor('#334155')
        )

        or_style = ParagraphStyle(
            'OrStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=2,
            spaceAfter=2
        )

        story = []

        # 1. Top Right: Register Number Table (12 boxes)
        reg_cells = ["REGISTER NO.: "] + ["" for _ in range(12)]
        reg_table_data = [reg_cells]
        col_widths_actual = [90] + [16 for _ in range(12)] + [230]
        # Empty right spacer
        reg_table_data[0].append("")
        reg_table = Table(reg_table_data, colWidths=col_widths_actual, rowHeights=[18])
        reg_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 8),
            ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Draw grid around the 12 boxes
            ('GRID', (1, 0), (12, 0), 0.8, colors.HexColor('#0F172A')),
        ]))
        story.append(reg_table)
        story.append(Spacer(1, 4))

        # 2. Institution and Affiliation
        story.append(Paragraph(paper_data.get("institution_name", "V.S.B. ENGINEERING COLLEGE, KARUR."), inst_style))
        sub_inst_style = ParagraphStyle(
            'SubInstHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            leading=11,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#334155'),
            spaceAfter=3
        )
        story.append(Paragraph("(An Autonomous Institution, Affiliated to Anna University, Chennai)", sub_inst_style))

        # 3. Bordered Question Paper Code Box (Center)
        qp_code = paper_data.get('exam_code', '23ALT501')
        qp_box_data = [[Paragraph(f"<b>Question Paper Code: {qp_code}</b>", ParagraphStyle(
            'QPCodeText',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A')
        ))]]
        qp_box_table = Table(qp_box_data, colWidths=[200], rowHeights=[18])
        qp_box_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor('#0F172A')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(qp_box_table)
        story.append(Spacer(1, 3))

        # 4. Exam Details
        story.append(Paragraph(f"<b>{paper_data.get('exam_title', 'INTERNAL TEST - II')}</b>", exam_title_style))
        story.append(Paragraph(f"Academic Year: {paper_data.get('academic_year', '2026 - 27 (ODD Semester)')}", dept_style))
        story.append(Paragraph(paper_data.get('semester', 'Fifth Semester'), dept_style))
        story.append(Paragraph(paper_data.get('department_name', 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)'), dept_style))
        story.append(Paragraph(f"<b>{paper_data.get('subject_code', '23ALT501')} - {paper_data.get('subject_name', 'NATURAL LANGUAGE PROCESSING')}</b>", ParagraphStyle(
            'SubjHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=1
        )))
        story.append(Paragraph(f"({paper_data.get('regulations', 'Regulations 2023')})", sub_inst_style))

        # 5. Time, Date, Max Marks 3-column bar
        time_date_data = [
            [
                Paragraph(f"<b>Time: {paper_data.get('duration_minutes', 100)} Mins.</b>", meta_val_style),
                Paragraph(f"<b>Date: {paper_data.get('date_str', '05-10-2026')}</b>", ParagraphStyle(
                    'MetaCenter',
                    parent=styles['Normal'],
                    fontName='Helvetica-Bold',
                    fontSize=9,
                    alignment=TA_CENTER,
                    textColor=colors.HexColor('#0F172A')
                )),
                Paragraph(f"<b>Max. Marks: {paper_data.get('total_marks', 50)}</b>", meta_val_right)
            ]
        ]
        time_date_table = Table(time_date_data, colWidths=[170, 180, 170], rowHeights=[14])
        time_date_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEABOVE', (0, 0), (-1, 0), 0.6, colors.HexColor('#0F172A')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(time_date_table)
        story.append(Spacer(1, 2))

        # Directive
        story.append(Paragraph(f"<b>{paper_data.get('instructions', 'Answer ALL Questions')}</b>", ParagraphStyle(
            'DirectiveStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=2,
            spaceAfter=4
        )))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#0F172A'), spaceAfter=6))

        # 3. Sections & Questions
        for sec in paper_data.get("sections", []):
            story.append(Paragraph(sec.get("section_name", "PART - A"), section_hdr_style))
            story.append(Paragraph(sec.get("instructions", "Answer all questions"), section_sub_style))

            questions = sec.get("questions", [])
            idx = 0
            while idx < len(questions):
                q = questions[idx]

                if q.get("is_or_choice") and q.get("choice_side") == "A":
                    # Choice A and Choice B pair
                    q_b = questions[idx + 1] if idx + 1 < len(questions) and questions[idx + 1].get("is_or_choice") else None

                    # Row for A
                    q_num_str = f"{q.get('question_number', idx + 1)}. (a)"
                    tags_a = f"({q.get('course_outcome', 'CO1')}) [{q.get('blooms_level', 'UN')[:2].upper()}] ({q.get('marks', 13)})"
                    table_a_data = [[
                        Paragraph(q_num_str, q_num_style),
                        Paragraph(q.get("question_text", ""), q_text_style),
                        Paragraph(tags_a, q_tag_style)
                    ]]
                    tbl_a = Table(table_a_data, colWidths=[36, 410, 74])
                    tbl_a.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))

                    pair_elements = [tbl_a, Paragraph("(OR)", or_style)]

                    if q_b:
                        tags_b = f"({q_b.get('course_outcome', 'CO1')}) [{q_b.get('blooms_level', 'UN')[:2].upper()}] ({q_b.get('marks', 13)})"
                        table_b_data = [[
                            Paragraph(f"    (b)", q_num_style),
                            Paragraph(q_b.get("question_text", ""), q_text_style),
                            Paragraph(tags_b, q_tag_style)
                        ]]
                        tbl_b = Table(table_b_data, colWidths=[36, 410, 74])
                        tbl_b.setStyle(TableStyle([
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('TOPPADDING', (0, 0), (-1, -1), 3),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ]))
                        pair_elements.append(tbl_b)
                        idx += 1 # consumed both

                    pair_elements.append(Spacer(1, 4))
                    story.append(KeepTogether(pair_elements))

                else:
                    # Single question
                    q_num_str = f"{q.get('question_number', idx + 1)}."
                    tags = f"({q.get('course_outcome', 'CO1')}) [{q.get('blooms_level', 'UN')[:2].upper()}] ({q.get('marks', 2)})"
                    tbl_data = [[
                        Paragraph(q_num_str, q_num_style),
                        Paragraph(q.get("question_text", ""), q_text_style),
                        Paragraph(tags, q_tag_style)
                    ]]
                    tbl = Table(tbl_data, colWidths=[30, 416, 74])
                    tbl.setStyle(TableStyle([
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    story.append(tbl)

                idx += 1

            story.append(Spacer(1, 6))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_docx(paper_data: Dict[str, Any]) -> io.BytesIO:
        """Generates an editable Microsoft Word (.docx) university exam paper."""
        doc = Document()

        # Set standard margins (0.5 inch / 36 pt)
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

        # 1. Reg. No Table (12 boxes top-right)
        p_reg = doc.add_paragraph()
        p_reg.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run_reg_lbl = p_reg.add_run("REGISTER NO.: ")
        run_reg_lbl.bold = True
        run_reg_lbl.font.size = Pt(9)
        run_reg_lbl.font.name = 'Times New Roman'

        tbl_reg = doc.add_table(rows=1, cols=12)
        tbl_reg.alignment = WD_TABLE_ALIGNMENT.RIGHT
        for c in tbl_reg.rows[0].cells:
            c.width = Inches(0.25)
            c.text = ""

        # 2. Institution & Affiliation
        p_inst = doc.add_paragraph()
        p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_inst = p_inst.add_run(paper_data.get("institution_name", "V.S.B. ENGINEERING COLLEGE, KARUR."))
        run_inst.bold = True
        run_inst.font.size = Pt(13)
        run_inst.font.name = 'Times New Roman'

        p_aff = doc.add_paragraph()
        p_aff.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_aff = p_aff.add_run("(An Autonomous Institution, Affiliated to Anna University, Chennai)")
        run_aff.italic = True
        run_aff.font.size = Pt(9)
        run_aff.font.name = 'Times New Roman'

        # 3. Question Paper Code Box
        p_qp = doc.add_paragraph()
        p_qp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_qp = p_qp.add_run(f"Question Paper Code: {paper_data.get('exam_code', '23ALT501')}")
        run_qp.bold = True
        run_qp.font.size = Pt(9.5)
        run_qp.font.name = 'Times New Roman'

        # 4. Exam Details
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_title = p_title.add_run(paper_data.get("exam_title", "INTERNAL TEST - II"))
        run_title.bold = True
        run_title.font.size = Pt(11)
        run_title.font.name = 'Times New Roman'

        p_ay = doc.add_paragraph()
        p_ay.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_ay = p_ay.add_run(f"Academic Year: {paper_data.get('academic_year', '2026 - 27 (ODD Semester)')}")
        run_ay.font.size = Pt(9.5)
        run_ay.font.name = 'Times New Roman'

        p_sem = doc.add_paragraph()
        p_sem.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_sem = p_sem.add_run(paper_data.get('semester', 'Fifth Semester'))
        run_sem.font.size = Pt(9.5)
        run_sem.font.name = 'Times New Roman'

        p_dept = doc.add_paragraph()
        p_dept.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_dept = p_dept.add_run(paper_data.get("department_name", "Computer Science and Engineering (Artificial Intelligence and Machine Learning)"))
        run_dept.font.size = Pt(9.5)
        run_dept.font.name = 'Times New Roman'

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_sub = p_sub.add_run(f"{paper_data.get('subject_code', '23ALT501')} - {paper_data.get('subject_name', 'NATURAL LANGUAGE PROCESSING')}")
        run_sub.bold = True
        run_sub.font.size = Pt(10)
        run_sub.font.name = 'Times New Roman'

        p_regu = doc.add_paragraph()
        p_regu.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_regu = p_regu.add_run(f"({paper_data.get('regulations', 'Regulations 2023')})")
        run_regu.italic = True
        run_regu.font.size = Pt(9)
        run_regu.font.name = 'Times New Roman'

        # 5. Metadata Table (Time, Date, Max Marks)
        tbl_meta = doc.add_table(rows=1, cols=3)
        tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_meta.autofit = True

        r0 = tbl_meta.rows[0].cells
        r0[0].text = f"Time: {paper_data.get('duration_minutes', 100)} Mins."
        r0[1].text = f"Date: {paper_data.get('date_str', '05-10-2026')}"
        r0[2].text = f"Max. Marks: {paper_data.get('total_marks', 50)}"

        p_inst_text = doc.add_paragraph()
        p_inst_text.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_inst_text = p_inst_text.add_run(paper_data.get('instructions', 'Answer ALL Questions'))
        run_inst_text.bold = True
        run_inst_text.font.size = Pt(9.5)

        # Iterate Sections
        for sec in paper_data.get("sections", []):
            p_sec = doc.add_paragraph()
            p_sec.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run_sec = p_sec.add_run(sec.get("section_name", "PART - A"))
            run_sec.bold = True
            run_sec.font.size = Pt(11)

            p_sec_sub = doc.add_paragraph()
            p_sec_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run_sec_sub = p_sec_sub.add_run(sec.get("instructions", "Answer all questions"))
            run_sec_sub.italic = True
            run_sec_sub.font.size = Pt(9.5)

            questions = sec.get("questions", [])
            idx = 0
            while idx < len(questions):
                q = questions[idx]
                if q.get("is_or_choice") and q.get("choice_side") == "A":
                    q_b = questions[idx + 1] if idx + 1 < len(questions) and questions[idx + 1].get("is_or_choice") else None

                    # A
                    p_q = doc.add_paragraph()
                    p_q.add_run(f"{q.get('question_number', idx + 1)}. (a) ").bold = True
                    p_q.add_run(q.get("question_text", ""))
                    p_q.add_run(f"   ({q.get('course_outcome', 'CO1')}) [{q.get('blooms_level', 'UN')[:2].upper()}] ({q.get('marks', 13)} Marks)").italic = True

                    # OR
                    p_or = doc.add_paragraph()
                    p_or.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_or.add_run("(OR)").bold = True

                    # B
                    if q_b:
                        p_qb = doc.add_paragraph()
                        p_qb.add_run(f"    (b) ").bold = True
                        p_qb.add_run(q_b.get("question_text", ""))
                        p_qb.add_run(f"   ({q_b.get('course_outcome', 'CO1')}) [{q_b.get('blooms_level', 'UN')[:2].upper()}] ({q_b.get('marks', 13)} Marks)").italic = True
                        idx += 1

                else:
                    p_q = doc.add_paragraph()
                    p_q.add_run(f"{q.get('question_number', idx + 1)}. ").bold = True
                    p_q.add_run(q.get("question_text", ""))
                    p_q.add_run(f"   ({q.get('course_outcome', 'CO1')}) [{q.get('blooms_level', 'UN')[:2].upper()}] ({q.get('marks', 2)} Marks)").italic = True

                idx += 1

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
