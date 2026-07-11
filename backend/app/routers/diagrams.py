import os
import json
import shutil
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Diagram, User
from app.schemas import DiagramDetailResponse, DiagramListItem
from app.auth import get_current_user
from app.config import UPLOAD_DIR
from app.services.ocr_service import extract_text_from_diagram
from app.services.llm_service import analyze_architecture

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/api/diagrams", tags=["diagrams"])

def process_diagram_analysis(diagram_id: str):
    db: Session = SessionLocal()
    try:
        diagram = db.query(Diagram).filter(Diagram.id == diagram_id).first()
        if not diagram:
            return
        
        diagram.status = "PROCESSING_OCR"
        db.commit()
        
        ocr_text = extract_text_from_diagram(diagram.file_path)
        diagram.ocr_text = ocr_text
        db.commit()
        
        diagram.status = "PROCESSING_LLM"
        db.commit()
        
        analysis = analyze_architecture(ocr_text)
        
        diagram.architecture_summary = analysis.get("architecture_summary")
        diagram.workflow_explanation = analysis.get("workflow_explanation")
        diagram.tech_stack = analysis.get("tech_stack")
        diagram.components = analysis.get("components")
        diagram.suggested_apis = analysis.get("suggested_apis")
        diagram.database_entities = analysis.get("database_entities")
        
        diagram.status = "COMPLETED"
        diagram.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        print(f"Error in background task for diagram {diagram_id}: {e}")
        diagram = db.query(Diagram).filter(Diagram.id == diagram_id).first()
        if diagram:
            diagram.status = "FAILED"
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DiagramListItem, status_code=status.HTTP_201_CREATED)
def upload_diagram(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PNG, JPG, or PDF file."
        )
    
    diagram_id = str(uuid.uuid4())
    unique_filename = f"{diagram_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )
    
    new_diagram = Diagram(
        id=diagram_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        status="uploaded"
    )
    db.add(new_diagram)
    db.commit()
    db.refresh(new_diagram)
    
    # OCR and analysis will be triggered synchronously via POST /api/analyze/{upload_id}
    
    return new_diagram


@router.get("/{diagram_id}", response_model=DiagramDetailResponse)
def get_diagram_details(
    diagram_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    diagram = db.query(Diagram).filter(
        Diagram.id == diagram_id,
        Diagram.user_id == current_user.id
    ).first()
    
    if not diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagram not found or access denied"
        )
    
    return diagram


@router.get("/{diagram_id}/download/{export_format}")
def download_diagram_report(
    diagram_id: str,
    export_format: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    diagram = db.query(Diagram).filter(
        Diagram.id == diagram_id,
        Diagram.user_id == current_user.id
    ).first()
    
    if not diagram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagram not found"
        )
    
    if diagram.status.upper() != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis is not completed yet"
        )
        
    export_format = export_format.lower()
    
    if export_format == "json":
        report_data = {
            "diagram_id": diagram.id,
            "filename": diagram.filename,
            "created_at": diagram.created_at.isoformat(),
            "completed_at": diagram.completed_at.isoformat() if diagram.completed_at else None,
            "architecture_summary": diagram.architecture_summary,
            "workflow_explanation": diagram.workflow_explanation,
            "tech_stack": diagram.tech_stack,
            "components": diagram.components,
            "suggested_apis": diagram.suggested_apis,
            "database_entities": diagram.database_entities
        }
        json_content = json.dumps(report_data, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={os.path.splitext(diagram.filename)[0]}_report.json"}
        )
        
    elif export_format == "markdown":
        md_content = f"# Engineering Report: {os.path.splitext(diagram.filename)[0]}\n\n"
        md_content += f"**Original Diagram:** {diagram.filename}\n"
        md_content += f"**Generated At:** {diagram.completed_at.strftime('%Y-%m-%d %H:%M:%S') if diagram.completed_at else 'N/A'}\n\n"
        
        md_content += "## 1. Architecture Summary\n"
        md_content += f"{diagram.architecture_summary}\n\n"
        
        md_content += "## 2. Workflow Explanation\n"
        md_content += f"{diagram.workflow_explanation}\n\n"
        
        md_content += "## 3. Technology Stack\n"
        if diagram.tech_stack:
            for layer, items in diagram.tech_stack.items():
                md_content += f"- **{layer.capitalize()}:** {', '.join(items)}\n"
        md_content += "\n"
        
        md_content += "## 4. Components List\n"
        if diagram.components:
            for comp in diagram.components:
                md_content += f"- **{comp.get('name')}** ({comp.get('type')}): {comp.get('description')}\n"
        md_content += "\n"
        
        md_content += "## 5. Suggested APIs\n"
        if diagram.suggested_apis:
            for api in diagram.suggested_apis:
                md_content += f"### `{api.get('method')}` {api.get('path')}\n"
                md_content += f"**Description:** {api.get('description')}\n"
                if api.get('request_body') != "None":
                    md_content += f"**Request Body:**\n```json\n{api.get('request_body')}\n```\n"
                md_content += f"**Response Body:**\n```json\n{api.get('response_body')}\n```\n\n"
                
        md_content += "## 6. Database Entities\n"
        if diagram.database_entities:
            for entity in diagram.database_entities:
                md_content += f"### Table: `{entity.get('name')}`\n"
                md_content += "| Column Name | Type/Attributes |\n"
                md_content += "| --- | --- |\n"
                for col in entity.get("columns", []):
                    md_content += f"| {col.get('name')} | {col.get('type')} |\n"
                md_content += "\n"
                
        return Response(
            content=md_content,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={os.path.splitext(diagram.filename)[0]}_report.md"}
        )
        
    elif export_format == "pdf":
        temp_pdf_path = os.path.join(UPLOAD_DIR, f"{diagram.id}_report.pdf")
        
        try:
            doc = SimpleDocTemplate(
                temp_pdf_path,
                pagesize=letter,
                rightMargin=40,
                leftMargin=40,
                topMargin=40,
                bottomMargin=40
            )
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=20,
                textColor=colors.HexColor('#1E293B'),
                spaceAfter=15
            )
            h2_style = ParagraphStyle(
                'DocH2',
                parent=styles['Heading2'],
                fontSize=14,
                textColor=colors.HexColor('#0F766E'),
                spaceBefore=14,
                spaceAfter=6,
                keepWithNext=True
            )
            body_style = ParagraphStyle(
                'DocBody',
                parent=styles['BodyText'],
                fontSize=9.5,
                textColor=colors.HexColor('#334155'),
                spaceAfter=8
            )
            list_item_style = ParagraphStyle(
                'DocListItem',
                parent=styles['BodyText'],
                fontSize=9.5,
                textColor=colors.HexColor('#334155'),
                leftIndent=15,
                spaceAfter=4
            )
            
            story = []
            
            story.append(Paragraph(f"Engineering Architecture Report: {os.path.splitext(diagram.filename)[0]}", title_style))
            story.append(Paragraph(f"<b>Original File:</b> {diagram.filename}  |  <b>Analyzed At:</b> {diagram.completed_at.strftime('%Y-%m-%d %H:%M:%S')}", body_style))
            story.append(Spacer(1, 12))
            
            story.append(Paragraph("1. Architecture Summary", h2_style))
            story.append(Paragraph(diagram.architecture_summary or "N/A", body_style))
            story.append(Spacer(1, 8))
            
            story.append(Paragraph("2. Workflow Explanation", h2_style))
            workflow_lines = (diagram.workflow_explanation or "").split('\n')
            for line in workflow_lines:
                if line.strip():
                    story.append(Paragraph(line.strip(), body_style))
            story.append(Spacer(1, 8))
            
            story.append(Paragraph("3. Technology Stack", h2_style))
            if diagram.tech_stack:
                for layer, items in diagram.tech_stack.items():
                    story.append(Paragraph(f"<b>{layer.capitalize()}:</b> {', '.join(items)}", list_item_style))
            story.append(Spacer(1, 8))
            
            story.append(Paragraph("4. System Components", h2_style))
            if diagram.components:
                data = [["Name", "Type", "Description"]]
                for comp in diagram.components:
                    data.append([
                        Paragraph(comp.get('name',''), body_style),
                        Paragraph(comp.get('type',''), body_style),
                        Paragraph(comp.get('description',''), body_style)
                    ])
                t = Table(data, colWidths=[110, 110, 310])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F766E')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('BOTTOMPADDING', (0,0), (-1,0), 6),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ]))
                story.append(t)
            else:
                story.append(Paragraph("No component analysis available.", body_style))
            
            doc.build(story)
            
            return FileResponse(
                path=temp_pdf_path,
                filename=f"{os.path.splitext(diagram.filename)[0]}_report.pdf",
                media_type="application/pdf"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate PDF: {str(e)}"
            )
            
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{export_format}'. Use pdf, markdown, or json."
        )
