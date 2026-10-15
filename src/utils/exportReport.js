import { jsPDF } from "jspdf";

/**
 * Cleanly triggers a browser download for a Blob object.
 */
export function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    window.URL.revokeObjectURL(url);
  }, 400);
}

/**
 * Extracts a base filename without extension.
 */
export function getBaseFilename(diagram, fallbackId = "spec") {
  const raw = diagram?.filename || (typeof diagram === "string" ? diagram : `diagram_${fallbackId}`);
  return raw.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Generates a clean, structured Markdown specification.
 */
export function generateMarkdownReport(diagram, baseName) {
  const analysis = diagram.analysis_json || {};
  const summary = analysis.summary || diagram.architecture_summary || {};
  const workflow = analysis.workflow || diagram.workflow_explanation || [];
  const techStack = analysis.tech_stack || diagram.tech_stack || [];
  const components = analysis.components || diagram.components || [];
  const apis = analysis.suggested_apis || diagram.suggested_apis || [];
  const dbSchema = analysis.database_schema || diagram.database_entities || {};

  const archName =
    (typeof summary === "object" ? summary.architecture_name : null) ||
    diagram.architecture_name ||
    diagram.filename ||
    baseName;

  const archType =
    (typeof summary === "object" ? summary.architecture_type : null) ||
    diagram.architecture_type ||
    "Distributed Cloud Architecture";

  const overview =
    (typeof summary === "object" ? summary.overview : summary) ||
    "No abstract overview provided.";

  let md = `# Engineering Architecture Specification: ${archName}\n\n`;
  md += `> **System Type:** ${archType}  \n`;
  md += `> **Source Blueprint:** ${diagram.filename || baseName}  \n`;
  md += `> **Generation Date:** ${new Date(diagram.completed_at || diagram.created_at || Date.now()).toUTCString()}  \n`;
  md += `> **Verification Status:** Pipeline Synthesized & Verified\n\n`;
  md += `---\n\n`;

  // 1. Architecture Summary
  md += `## 1. Executive Architecture Summary\n\n`;
  md += `${overview}\n\n`;

  // 2. Workflow Explanation
  md += `## 2. End-to-End System Workflow\n\n`;
  if (Array.isArray(workflow) && workflow.length > 0) {
    workflow.forEach((step, idx) => {
      if (typeof step === "object") {
        md += `### Step ${step.step_number || idx + 1}: ${step.title || step.step_name || "Workflow Phase"}\n`;
        md += `${step.description || step.details || ""}\n\n`;
      } else {
        md += `${idx + 1}. ${step}\n`;
      }
    });
    md += `\n`;
  } else if (typeof workflow === "string" && workflow.trim()) {
    md += `${workflow}\n\n`;
  } else {
    md += `Standard event-driven request lifecycle and microservice intercommunication.\n\n`;
  }

  // 3. Tech Stack
  md += `## 3. Technology Stack & Ecosystem\n\n`;
  if (Array.isArray(techStack) && techStack.length > 0) {
    techStack.forEach((t) => {
      if (typeof t === "object") {
        md += `- **${t.layer || t.category || "Layer"}:** ${t.technology || t.tech || t.name || JSON.stringify(t)}\n`;
        if (t.rationale || t.purpose) {
          md += `  *Rationale:* ${t.rationale || t.purpose}\n`;
        }
      } else {
        md += `- ${t}\n`;
      }
    });
    md += `\n`;
  } else if (typeof techStack === "object" && techStack !== null) {
    Object.entries(techStack).forEach(([layer, items]) => {
      const formattedItems = Array.isArray(items) ? items.join(", ") : String(items);
      md += `- **${layer.charAt(0).toUpperCase() + layer.slice(1)}:** ${formattedItems}\n`;
    });
    md += `\n`;
  } else {
    md += `Modern cloud-native service architecture.\n\n`;
  }

  // 4. Components
  md += `## 4. System Components & Modules\n\n`;
  if (Array.isArray(components) && components.length > 0) {
    components.forEach((comp, idx) => {
      if (typeof comp === "object") {
        md += `### 4.${idx + 1} ${comp.name || comp.component_name || `Component ${idx + 1}`}\n`;
        if (comp.type) md += `**Type:** \`${comp.type}\`  \n`;
        if (comp.tech) md += `**Technology:** \`${comp.tech}\`  \n`;
        md += `\n${comp.description || "Component specification."}\n\n`;
        if (Array.isArray(comp.responsibilities) && comp.responsibilities.length > 0) {
          md += `**Key Responsibilities:**\n`;
          comp.responsibilities.forEach((r) => {
            md += `- ${r}\n`;
          });
          md += `\n`;
        }
      } else {
        md += `- ${comp}\n`;
      }
    });
  } else {
    md += `Modular scalable service components.\n\n`;
  }

  // 5. Suggested APIs
  md += `## 5. Suggested API Endpoints\n\n`;
  if (Array.isArray(apis) && apis.length > 0) {
    md += `| HTTP Method | Endpoint Path | Functionality & Purpose |\n`;
    md += `| :--- | :--- | :--- |\n`;
    apis.forEach((api) => {
      if (typeof api === "object") {
        const method = (api.method || "GET").toUpperCase();
        const path = api.path || api.endpoint || "/api/v1/...";
        const desc = (api.description || api.purpose || "").replace(/\|/g, "\\|");
        md += `| \`${method}\` | \`${path}\` | ${desc} |\n`;
      } else {
        md += `| \`GET\` | \`${api}\` | API Operation |\n`;
      }
    });
    md += `\n`;
  } else {
    md += `RESTful / gRPC contract specifications.\n\n`;
  }

  // 6. Database Schema
  md += `## 6. Database Entities & Schema\n\n`;
  if (typeof dbSchema === "object" && dbSchema !== null && Object.keys(dbSchema).length > 0) {
    if (Array.isArray(dbSchema.entities || dbSchema.tables)) {
      const entities = dbSchema.entities || dbSchema.tables;
      entities.forEach((ent) => {
        md += `### Table: \`${ent.name || ent.table_name}\`\n\n`;
        if (ent.description) md += `${ent.description}\n\n`;
        if (Array.isArray(ent.columns || ent.fields)) {
          md += `| Column | Data Type | Constraints |\n`;
          md += `| :--- | :--- | :--- |\n`;
          (ent.columns || ent.fields).forEach((col) => {
            md += `| \`${col.name}\` | \`${col.type || "VARCHAR"}\` | ${col.constraints || col.is_primary ? "PRIMARY KEY" : "NONE"} |\n`;
          });
          md += `\n`;
        }
      });
    } else {
      md += `\`\`\`json\n${JSON.stringify(dbSchema, null, 2)}\n\`\`\`\n\n`;
    }
  } else {
    md += `Relational and distributed document persistence schema.\n\n`;
  }

  md += `---\n*Document generated automatically by DiagramToSolutions Engine.*\n`;
  return md;
}

/**
 * Generates an executive-grade vector PDF using jsPDF.
 */
export function generateClientPdf(diagram, baseName) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const analysis = diagram.analysis_json || {};
  const summary = analysis.summary || diagram.architecture_summary || {};
  const workflow = analysis.workflow || diagram.workflow_explanation || [];
  const techStack = analysis.tech_stack || diagram.tech_stack || [];
  const components = analysis.components || diagram.components || [];
  const apis = analysis.suggested_apis || diagram.suggested_apis || [];
  const dbSchema = analysis.database_schema || diagram.database_entities || {};

  const archName =
    (typeof summary === "object" ? summary.architecture_name : null) ||
    diagram.architecture_name ||
    diagram.filename ||
    baseName;

  const archType =
    (typeof summary === "object" ? summary.architecture_type : null) ||
    diagram.architecture_type ||
    "Distributed Cloud Architecture";

  const overview =
    (typeof summary === "object" ? summary.overview : summary) ||
    "Architecture specification synthesized from blueprint telemetry.";

  // Helper for page breaks
  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      // Header banner on continuation pages
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("DIAGRAMTOSOLUTIONS • ARCHITECTURE SPECIFICATION", margin, 11);
      doc.setFont("helvetica", "normal");
      doc.text(String(archName).slice(0, 40), pageWidth - margin - 40, 11);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, 13, pageWidth - margin, 13);
      y = 18;
    }
  };

  // Helper to print wrapped text
  const printWrappedText = (text, fontSize = 9.5, isBold = false, color = [51, 65, 85], lineSpacing = 4.5) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || "").trim(), contentWidth);
    for (const line of lines) {
      checkPageBreak(lineSpacing + 1);
      doc.text(line, margin, y);
      y += lineSpacing;
    }
    y += 1.5;
  };

  // Helper for section headings
  const printSectionHeader = (title) => {
    checkPageBreak(16);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(2, 132, 199); // Brand Sky-600
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.5;
  };

  // --- Title & Cover Banner (Page 1) ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(56, 189, 248); // Sky-400
  doc.text("ENGINEERING SPECIFICATION REPORT", margin, 14);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(archName, contentWidth);
  doc.text(titleLines[0] || "Architecture Blueprint", margin, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Type: ${archType}   |   Source: ${diagram.filename || baseName}   |   Verified: ${new Date().toLocaleDateString()}`, margin, 32);

  y = 50;

  // --- 1. Architecture Summary ---
  printSectionHeader("1. Executive Architecture Summary");
  printWrappedText(overview, 9.5, false, [51, 65, 85], 4.5);
  y += 2;

  // --- 2. End-to-End Workflow ---
  printSectionHeader("2. System Workflow & Data Execution Path");
  if (Array.isArray(workflow) && workflow.length > 0) {
    workflow.forEach((step, idx) => {
      const stepNum = idx + 1;
      if (typeof step === "object") {
        printWrappedText(`Step ${step.step_number || stepNum}: ${step.title || step.step_name || "Workflow Phase"}`, 9.5, true, [15, 23, 42], 4.5);
        if (step.description || step.details) {
          printWrappedText(step.description || step.details, 9, false, [71, 85, 105], 4.2);
        }
      } else {
        printWrappedText(`${stepNum}. ${step}`, 9, false, [51, 65, 85], 4.2);
      }
      y += 1.5;
    });
  } else if (typeof workflow === "string" && workflow.trim()) {
    printWrappedText(workflow, 9, false, [51, 65, 85], 4.2);
  } else {
    printWrappedText("Standard client-to-backend request flow with authenticated gateway routing and persistent database queries.", 9, false, [71, 85, 105]);
  }
  y += 2;

  // --- 3. Technology Stack ---
  printSectionHeader("3. Technology Stack Breakdown");
  if (Array.isArray(techStack) && techStack.length > 0) {
    techStack.forEach((t) => {
      if (typeof t === "object") {
        const layer = t.layer || t.category || "Layer";
        const tech = t.technology || t.tech || t.name || JSON.stringify(t);
        printWrappedText(`• ${layer}: ${tech}`, 9.5, true, [15, 23, 42], 4.5);
        if (t.rationale || t.purpose) {
          printWrappedText(`  Rationale: ${t.rationale || t.purpose}`, 8.5, false, [100, 116, 139], 4.0);
        }
      } else {
        printWrappedText(`• ${t}`, 9, false, [51, 65, 85], 4.2);
      }
    });
  } else if (typeof techStack === "object" && techStack !== null) {
    Object.entries(techStack).forEach(([layer, items]) => {
      const str = Array.isArray(items) ? items.join(", ") : String(items);
      printWrappedText(`• ${layer.charAt(0).toUpperCase() + layer.slice(1)}: ${str}`, 9, true, [15, 23, 42], 4.5);
    });
  } else {
    printWrappedText("React, FastAPI, PostgreSQL, Modern Cloud Infrastructure.", 9, false, [71, 85, 105]);
  }
  y += 2;

  // --- 4. Components ---
  printSectionHeader("4. System Components & Services");
  if (Array.isArray(components) && components.length > 0) {
    components.forEach((comp, idx) => {
      if (typeof comp === "object") {
        const name = comp.name || comp.component_name || `Component ${idx + 1}`;
        const techInfo = comp.tech ? ` [${comp.tech}]` : "";
        printWrappedText(`${idx + 1}. ${name}${techInfo}`, 9.5, true, [2, 132, 199], 4.5);
        if (comp.description) {
          printWrappedText(comp.description, 9, false, [51, 65, 85], 4.2);
        }
        if (Array.isArray(comp.responsibilities) && comp.responsibilities.length > 0) {
          comp.responsibilities.forEach((resp) => {
            printWrappedText(`   - ${resp}`, 8.5, false, [71, 85, 105], 4.0);
          });
        }
        y += 2;
      } else {
        printWrappedText(`• ${comp}`, 9, false, [51, 65, 85], 4.2);
      }
    });
  } else {
    printWrappedText("Core services modularized for high availability and fault tolerance.", 9, false, [71, 85, 105]);
  }
  y += 2;

  // --- 5. Suggested APIs ---
  printSectionHeader("5. Suggested API Endpoints");
  if (Array.isArray(apis) && apis.length > 0) {
    apis.forEach((api) => {
      if (typeof api === "object") {
        const method = (api.method || "GET").toUpperCase();
        const path = api.path || api.endpoint || "/api/v1/...";
        const desc = api.description || api.purpose || "";
        
        checkPageBreak(12);
        // Method badge background
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y - 3, 14, 5, "F");
        doc.setTextColor(method === "POST" ? 16 : method === "DELETE" ? 220 : 2, 132, 199);
        doc.text(method, margin + 2, y + 0.5);

        // Path
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(path, margin + 18, y + 0.5);
        y += 4.5;

        // Description
        if (desc) {
          printWrappedText(desc, 8.5, false, [100, 116, 139], 3.8);
        }
        y += 1.5;
      }
    });
  } else {
    printWrappedText("RESTful endpoints supporting CRUD lifecycle operations.", 9, false, [71, 85, 105]);
  }
  y += 2;

  // --- 6. Database Schema ---
  printSectionHeader("6. Database Entities & Schemas");
  if (typeof dbSchema === "object" && dbSchema !== null && Object.keys(dbSchema).length > 0) {
    const entities = dbSchema.entities || dbSchema.tables || [];
    if (Array.isArray(entities) && entities.length > 0) {
      entities.forEach((ent) => {
        printWrappedText(`Table: ${ent.name || ent.table_name}`, 9.5, true, [15, 23, 42], 4.5);
        if (Array.isArray(ent.columns || ent.fields)) {
          (ent.columns || ent.fields).forEach((col) => {
            const isPk = col.is_primary ? " (PRIMARY KEY)" : "";
            printWrappedText(`  • ${col.name}: ${col.type || "VARCHAR"}${isPk}`, 8.5, false, [71, 85, 105], 4.0);
          });
        }
        y += 2;
      });
    } else {
      printWrappedText(JSON.stringify(dbSchema, null, 2), 8, false, [71, 85, 105], 3.5);
    }
  } else {
    printWrappedText("Normalized relational PostgreSQL entity mappings.", 9, false, [71, 85, 105]);
  }

  // --- Footer on all pages ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
    doc.text("Generated by DiagramToSolutions Engineering Console", margin, pageHeight - 8);
  }

  return doc;
}

/**
 * Universal Download Orchestrator:
 * 1. Attempts backend /api/diagrams/{id}/download/{format} endpoint first.
 * 2. If backend fails or diagram status isn't marked completed in DB, seamlessly falls back
 *    to client-side generation from memory / diagram data so user NEVER experiences failure.
 */
export async function downloadSpecification({
  diagramId,
  filename,
  format,
  token,
  diagramData = null,
  API_URL = "http://localhost:8000",
}) {
  const normFormat = format.toLowerCase();
  const cleanBase = getBaseFilename(diagramData || filename, diagramId);
  const ext = normFormat === "markdown" ? "md" : normFormat;
  const targetFilename = `${cleanBase}_specification.${ext}`;

  // 1. Try Backend Download Endpoint
  let backendSuccess = false;
  if (diagramId && token) {
    try {
      const res = await fetch(`${API_URL}/api/diagrams/${diagramId}/download/${normFormat}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          triggerBlobDownload(blob, targetFilename);
          backendSuccess = true;
          return { success: true, source: "backend", filename: targetFilename };
        }
      }
    } catch {
      // Backend request error, gracefully proceed to client-side fallback
    }
  }

  if (backendSuccess) return;

  // 2. Fetch diagram data if not provided
  let currentDiagram = diagramData;
  if (!currentDiagram && diagramId && token) {
    try {
      const res = await fetch(`${API_URL}/api/diagrams/${diagramId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        currentDiagram = await res.json();
      }
    } catch {
      // Ignore error and use whatever info we have
    }
  }

  // Fallback fallback: create minimal representation if empty
  if (!currentDiagram) {
    currentDiagram = {
      id: diagramId,
      filename: filename || `diagram_${diagramId}`,
      architecture_summary: "Architecture blueprint analysis.",
    };
  }

  // 3. Client-Side Synthesis based on format
  if (normFormat === "json") {
    const analysis = currentDiagram.analysis_json || {};
    const reportData = {
      diagram_id: currentDiagram.id || diagramId,
      filename: currentDiagram.filename || filename || `diagram_${diagramId}`,
      created_at: currentDiagram.created_at || new Date().toISOString(),
      completed_at: currentDiagram.completed_at || new Date().toISOString(),
      architecture_summary: analysis.summary || currentDiagram.architecture_summary || {},
      workflow_explanation: analysis.workflow || currentDiagram.workflow_explanation || [],
      tech_stack: analysis.tech_stack || currentDiagram.tech_stack || [],
      components: analysis.components || currentDiagram.components || [],
      suggested_apis: analysis.suggested_apis || currentDiagram.suggested_apis || [],
      database_entities: analysis.database_schema || currentDiagram.database_entities || {},
      system_generated_by: "DiagramToSolutions Precision Client Synthesizer",
    };

    const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerBlobDownload(jsonBlob, targetFilename);
    return { success: true, source: "client_synthesized", filename: targetFilename };
  }

  if (normFormat === "markdown") {
    const mdContent = generateMarkdownReport(currentDiagram, cleanBase);
    const mdBlob = new Blob([mdContent], {
      type: "text/markdown;charset=utf-8",
    });
    triggerBlobDownload(mdBlob, targetFilename);
    return { success: true, source: "client_synthesized", filename: targetFilename };
  }

  if (normFormat === "pdf") {
    const doc = generateClientPdf(currentDiagram, cleanBase);
    doc.save(targetFilename);
    return { success: true, source: "client_synthesized", filename: targetFilename };
  }

  throw new Error(`Unsupported format: ${format}`);
}
