import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def generate_pdf():
    pdf_path = os.path.abspath("ORCA_Project_Layman_Guide.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0284c7"),
        spaceAfter=15
    )

    q_style = ParagraphStyle(
        'QuestionStyle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=12,
        spaceAfter=6
    )

    a_style = ParagraphStyle(
        'AnswerStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=15,
        spaceAfter=4
    )

    story = []

    # Title Banner
    story.append(Paragraph("🐋 ORCA Marine Intelligence Platform", title_style))
    story.append(Paragraph("Simple Layman's Project Guide & Process Breakdown (Q&A Format) | ISRO Marine Intelligence Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=15))

    qa_list = [
        (
            "Q1: What is this project all about in plain words?",
            "Think of ORCA as a smart <b>AI Ocean Assistant</b> designed for fishermen, boat captains, coastal guards, and marine researchers in India.<br/><br/>"
            "Just like asking Google Maps for directions to a restaurant, anyone can ask ORCA questions about the sea in simple everyday words—such as <i>'Where can I catch the most fish today near Kochi?'</i> or <i>'Is the sea safe near Mumbai right now?'</i>—and get instant, friendly advice along with a live interactive map."
        ),
        (
            "Q2: What main real-world problems does ORCA solve?",
            "ORCA addresses four major challenges faced by coastal communities:<br/>"
            "• <b>Finding Fish Easily:</b> Saves fishermen time and expensive boat fuel by highlighting exact ocean areas (Potential Fishing Zones) where fish are gathering.<br/>"
            "• <b>Keeping Boaters Safe:</b> Warns boat captains about dangerous high waves, strong winds, or sudden storm warnings.<br/>"
            "• <b>Preventing International Border Crossings:</b> Alerts fishermen if they drift too close to international sea boundaries (like Sri Lanka, Pakistan, or Bangladesh) to avoid arrests or fines.<br/>"
            "• <b>Removing Language Barriers:</b> Operates in 10 local Indian coastal languages so fishermen can speak or listen in their mother tongue."
        ),
        (
            "Q3: What are the main parts of the system that were built?",
            "The system consists of 4 main building blocks:<br/>"
            "1. <b>The Visual Map (Frontend):</b> An interactive map displaying colored shapes—green for fishing zones, red for storm warnings, purple for sea boundaries, and cyan for safe boat routes.<br/>"
            "2. <b>The AI Brain (Backend Agents):</b> Smart digital assistants that calculate sea temperatures, weather risks, and safe navigation paths.<br/>"
            "3. <b>The Multi-Lingual Translator:</b> Converts questions typed or spoken in regional Indian languages into English for the AI, and translates the answer back.<br/>"
            "4. <b>The Natural Human Voice Engine:</b> Speaks the answers out loud in realistic, human voice accents (Tamil, Hindi, Marathi, Bengali, etc.) so boaters can just listen."
        ),
        (
            "Q4: How does it work step-by-step when a user asks a question?",
            "Here is the exact journey of a question:<br/>"
            "• <b>Step 1 (Ask):</b> The user types or speaks a question (e.g. <i>'Show me safe routes near Goa'</i>).<br/>"
            "• <b>Step 2 (Translate):</b> The system detects the language (e.g. Konkani or Marathi) and converts it for internal processing.<br/>"
            "• <b>Step 3 (AI Analysis):</b> Smart agents analyze sea coordinates, wind speeds, wave heights, and fish concentration data.<br/>"
            "• <b>Step 4 (Map Fly & Draw):</b> The map automatically zooms directly to Goa and draws colored shapes showing safe path lines.<br/>"
            "• <b>Step 5 (Speak Back):</b> The system speaks the response out loud in a natural human regional voice."
        ),
        (
            "Q5: Which languages and coastal regions are covered?",
            "• <b>11 Supported Languages:</b> Hindi, Gujarati, Marathi, Konkani, Kannada, Malayalam, Tamil, Telugu, Odia, Bengali, and English.<br/>"
            "• <b>All 7,516 km of Indian Coastline:</b> Covers 35+ major ports and harbors across Gujarat, Maharashtra, Goa, Karnataka, Kerala, Tamil Nadu, Andhra Pradesh, Odisha, West Bengal, Lakshadweep, and Andaman & Nicobar."
        ),
        (
            "Q6: How was the app built and deployed on Vercel?",
            "• <b>Frontend:</b> Built using React & MapLibre GL for smooth map rendering.<br/>"
            "• <b>Backend:</b> Built with FastAPI (Python) & LangGraph for AI multi-agent orchestration.<br/>"
            "• <b>Deployment:</b> Configured for instant deployment on Vercel with automatic mock data fallback (so it runs cleanly without needing complex satellite API setup)."
        )
    ]

    for q, a in qa_list:
        story.append(Paragraph(q, q_style))
        story.append(Paragraph(a, a_style))
        story.append(Spacer(1, 4))

    # Summary box
    story.append(Spacer(1, 10))
    summary_data = [
        [Paragraph("<b>Project Summary Status:</b> Fully Built & Ready for Vercel Demo | ISRO Marine Intelligence Platform", ParagraphStyle('BoxText', fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor("#0369a1")))]
    ]
    summary_table = Table(summary_data, colWidths=[530])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(summary_table)

    doc.build(story)
    print(f"PDF successfully generated at: {pdf_path}")
    return pdf_path

if __name__ == '__main__':
    generate_pdf()
