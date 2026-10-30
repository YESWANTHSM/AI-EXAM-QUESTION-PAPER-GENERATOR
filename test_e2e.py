import requests
import json
import os

API = "http://127.0.0.1:8000/api"

def test_full_pipeline():
    print("=== 1. TESTING DOCUMENT UPLOAD & EXTRACTION ===")
    sample_excel = os.path.join(os.path.dirname(__file__), "backend", "sample_files", "CS3452_Theory_Of_Computation_Bank.xlsx")
    with open(sample_excel, "rb") as f:
        res = requests.post(
            f"{API}/documents/upload",
            files={"file": ("CS3452_Theory_Of_Computation_Bank.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"subject_id": 1, "doc_category": "question_bank"}
        )
    print("Upload Status:", res.status_code)
    upload_res = res.json()
    print("Extracted Questions:", upload_res.get("extracted_count"))
    doc_id = upload_res.get("document_id")
    assert upload_res.get("success") == True

    print("\n=== 2. TESTING QUESTION BANK RETRIEVAL ===")
    res = requests.get(f"{API}/questions?subject_id=1")
    qs = res.json()
    print("Total Questions for Subject 1:", len(qs))
    assert len(qs) >= 40

    print("\n=== 3. TESTING WIZARD GENERATE PAPER (MODE A: QUESTION BANK) ===")
    gen_payload = {
        "subject_id": 1,
        "selected_units": [1, 2, 3, 4, 5],
        "template_id": 1,
        "duration_minutes": 180,
        "generation_mode": "bank",
        "difficulty_distribution": {"Easy": 30, "Medium": 50, "Hard": 20}
    }
    res = requests.post(f"{API}/papers/generate", json=gen_payload)
    print("Generation Status:", res.status_code)
    gen_res = res.json()
    paper_id = gen_res.get("paper_id")
    print("Generated Paper ID:", paper_id)
    assert paper_id is not None

    print("\n=== 4. TESTING PAPER DETAILS & SECTIONS ===")
    res = requests.get(f"{API}/papers/{paper_id}")
    paper = res.json()
    print("Paper Title:", paper["title"])
    print("Total Marks:", paper["total_marks"])
    print("Sections Count:", len(paper["sections"]))
    first_q = paper["sections"][0]["questions"][0]
    first_q_id = first_q["id"]
    print("First Question:", first_q["question_text"][:50], "...")

    print("\n=== 5. TESTING INTERACTIVE QUESTION REPLACEMENT ===")
    res = requests.get(f"{API}/papers/{paper_id}/questions/{first_q_id}/alternatives")
    alts = res.json()
    print(f"Found {len(alts)} matching alternatives in bank.")
    if alts:
        alt_id = alts[0]["id"]
        res = requests.post(f"{API}/papers/{paper_id}/questions/{first_q_id}/replace", json={"replacement_question_id": alt_id})
        print("Replacement response:", res.json())
        assert res.json().get("success") == True

    print("\n=== 6. TESTING AI REGENERATION OF QUESTION ===")
    res = requests.post(f"{API}/papers/{paper_id}/questions/{first_q_id}/regenerate")
    regen_res = res.json()
    print("Regenerated Question:", regen_res.get("question_text"))
    assert regen_res.get("success") == True

    print("\n=== 7. TESTING LIVE MARKS EDITING & TOTAL RECALCULATION ===")
    res = requests.put(
        f"{API}/papers/{paper_id}/questions/{first_q_id}",
        json={"question_text": "Updated test question text.", "marks": 5}
    )
    print("Update Question Status:", res.status_code)

    # Check update endpoint recalculation
    res = requests.put(f"{API}/papers/{paper_id}/update", json={"title": "Revised Examination Paper 2026"})
    updated_paper = requests.get(f"{API}/papers/{paper_id}").json()
    print("Updated Total Marks:", updated_paper["total_marks"])

    print("\n=== 8. TESTING PDF AND DOCX EXPORTS ===")
    pdf_res = requests.get(f"{API}/papers/{paper_id}/export/pdf")
    print("PDF Export Status:", pdf_res.status_code, "Bytes:", len(pdf_res.content))
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 1000

    docx_res = requests.get(f"{API}/papers/{paper_id}/export/docx")
    print("DOCX Export Status:", docx_res.status_code, "Bytes:", len(docx_res.content))
    assert docx_res.status_code == 200
    assert len(docx_res.content) > 5000

    print("\n>>> ALL TESTS PASSED! FULL PIPELINE VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_pipeline()
