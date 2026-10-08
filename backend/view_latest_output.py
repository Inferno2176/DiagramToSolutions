import os
import sys
import json

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    row = conn.execute(text("""
        SELECT a.architecture_name, a.architecture_type, a.summary, 
               a.workflow_explanation, a.tech_stack, a.components, 
               a.suggested_apis, a.database_schema, a.model_name,
               d.storage_path, d.original_filename
        FROM analysis_results a
        JOIN diagram_uploads d ON d.id = a.diagram_upload_id
        JOIN users u ON u.id = d.user_id
        WHERE u.username = 'testuser11'
        ORDER BY a.created_at DESC
        LIMIT 1
    """)).fetchone()

    if row:
        print("==================================================================")
        print("          EXACT STORED DATA FOR TESTUSER11'S LATEST RUN           ")
        print("==================================================================")
        print(f"Original Input File: {row[10]}")
        print(f"File Storage Path:   {row[9]}")
        print(f"AI Model Used:       {row[8]}")
        print(f"Architecture Name:   {row[0]}")
        print(f"Architecture Type:   {row[1]}")
        print("\n--- 1. ARCHITECTURE OVERVIEW (Column: analysis_results.summary) ---")
        print(row[2])
        print("\n--- 2. WORKFLOW (Column: analysis_results.workflow_explanation) ---")
        print(row[3])
        print("\n--- 3. TECH STACK (Column: analysis_results.tech_stack [JSONB]) ---")
        print(json.dumps(row[4], indent=2))
        print("\n--- 4. COMPONENTS (Column: analysis_results.components [JSONB]) ---")
        print(json.dumps(row[5], indent=2))
        print("\n--- 5. SUGGESTED APIS (Column: analysis_results.suggested_apis [JSONB]) ---")
        print(json.dumps(row[6], indent=2))
        print("\n--- 6. DATABASE SCHEMA (Column: analysis_results.database_schema [JSONB]) ---")
        print(json.dumps(row[7], indent=2))
        print("==================================================================")
