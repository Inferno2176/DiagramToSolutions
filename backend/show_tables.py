import os
import sys
import json
from tabulate import tabulate

# Ensure clean UTF-8 console output on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine
from sqlalchemy import text

def format_stack(tech_stack):
    if not tech_stack:
        return "-"
    if isinstance(tech_stack, dict):
        items = []
        for k, v in tech_stack.items():
            if isinstance(v, list) and v:
                items.extend(v[:2])
            elif isinstance(v, str):
                items.append(v)
        return ", ".join(items[:4])
    elif isinstance(tech_stack, list):
        names = []
        for item in tech_stack:
            if isinstance(item, dict) and "technology" in item:
                names.append(item["technology"])
            elif isinstance(item, str):
                names.append(item)
        return ", ".join(names[:4])
    return str(tech_stack)[:30]

def show_master_table(target_user=None):
    with engine.connect() as conn:
        query = """
            SELECT 
                u.username,
                d.id,
                d.original_filename,
                d.file_type,
                d.processing_status,
                coalesce(o.total_detections, 0) as ocr_labels,
                coalesce(a.architecture_name, '-') as arch_name,
                coalesce(a.architecture_type, '-') as arch_type,
                a.tech_stack,
                case when a.components is not null then jsonb_array_length(a.components) else 0 end as comp_count,
                case when a.suggested_apis is not null then jsonb_array_length(a.suggested_apis) else 0 end as api_count,
                case when a.database_schema is not null then jsonb_array_length(a.database_schema) else 0 end as db_entities,
                d.uploaded_at
            FROM diagram_uploads d
            JOIN users u ON u.id = d.user_id
            LEFT JOIN ocr_results o ON o.diagram_upload_id = d.id
            LEFT JOIN analysis_results a ON a.diagram_upload_id = d.id
        """
        params = {}
        if target_user:
            query += " WHERE u.username = :user"
            params["user"] = target_user
            
        query += " ORDER BY d.uploaded_at DESC"
        
        rows = conn.execute(text(query), params).fetchall()
        
        table_data = []
        for r in rows:
            table_data.append([
                r[0],                    # User
                r[1][:8] + "..",         # Upload ID
                r[2][:24],               # Input Filename
                r[3],                    # Format
                r[4],                    # Status
                r[5],                    # OCR Labels
                r[6][:28] + (".." if len(r[6]) > 28 else ""), # Architecture
                format_stack(r[8])[:30], # Tech Stack
                r[9],                    # Components
                r[10],                   # APIs
                r[11],                   # DB Entities
                str(r[12])[:19] if r[12] else "-" # Uploaded At
            ])
            
        headers = [
            "User", "ID", "Input File", "Type", "Status", 
            "OCR #", "AI Architecture", "Tech Stack", "Comp #", "API #", "DB #", "Uploaded At"
        ]
        
        title = f"STORED DIAGRAM INPUTS & AI SOLUTIONS" + (f" (Filtered by: {target_user})" if target_user else "")
        print("\n" + "=" * 135)
        print(f" {title.center(133)} ")
        print("=" * 135)
        print(tabulate(table_data, headers=headers, tablefmt="grid"))
        print(f"Total Rows: {len(table_data)}\n")

if __name__ == "__main__":
    user_filter = sys.argv[1] if len(sys.argv) > 1 else None
    show_master_table(user_filter)
