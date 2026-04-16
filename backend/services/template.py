import copy
from io import BytesIO
from collections import Counter

from docx import Document
from docx.shared import Emu
from db.supabase import get_supabase_client

DEFAULT_STYLES = {
    "page": {
        "width_dxa": 12240,
        "height_dxa": 15840,
        "margin_top_dxa": 1080,
        "margin_bottom_dxa": 1080,
        "margin_left_dxa": 1080,
        "margin_right_dxa": 1080,
    },
    "name_style": {
        "font_name": "Calibri",
        "font_size_pt": 18,
        "bold": True,
        "color_hex": "1a2744",
    },
    "section_header_style": {
        "font_name": "Calibri",
        "font_size_pt": 11,
        "bold": True,
        "all_caps": True,
        "color_hex": "1a2744",
        "bottom_border": True,
    },
    "body_style": {
        "font_name": "Calibri",
        "font_size_pt": 10,
        "bold": False,
        "color_hex": "000000",
        "line_spacing_pt": 12,
    },
    "bullet_style": {
        "indent_left_dxa": 360,
        "hanging_dxa": 180,
        "space_after_pt": 2,
    },
}


def _emu_to_dxa(emu_val) -> int:
    if emu_val is None:
        return 0
    return int(Emu(emu_val) / 635)


def _get_run_font_info(run):
    font = run.font
    info = {}
    if font.name:
        info["font_name"] = font.name
    if font.size:
        info["font_size_pt"] = int(font.size.pt)
    info["bold"] = bool(font.bold)
    if font.color and font.color.rgb:
        info["color_hex"] = str(font.color.rgb).lower()
    return info


def extract_styles_from_template(docx_bytes: bytes) -> dict:
    try:
        doc = Document(BytesIO(docx_bytes))
        styles = copy.deepcopy(DEFAULT_STYLES)

        # Page dimensions from first section
        if doc.sections:
            sec = doc.sections[0]
            if sec.page_width:
                styles["page"]["width_dxa"] = _emu_to_dxa(sec.page_width)
            if sec.page_height:
                styles["page"]["height_dxa"] = _emu_to_dxa(sec.page_height)
            if sec.top_margin:
                styles["page"]["margin_top_dxa"] = _emu_to_dxa(sec.top_margin)
            if sec.bottom_margin:
                styles["page"]["margin_bottom_dxa"] = _emu_to_dxa(sec.bottom_margin)
            if sec.left_margin:
                styles["page"]["margin_left_dxa"] = _emu_to_dxa(sec.left_margin)
            if sec.right_margin:
                styles["page"]["margin_right_dxa"] = _emu_to_dxa(sec.right_margin)

        # Collect paragraph style data for heuristic identification
        largest_font_para = None
        largest_font_size = 0
        bold_caps_para = None
        body_fonts = Counter()
        bullet_para = None

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            runs = para.runs
            if not runs:
                continue

            first_run = runs[0]
            font_info = _get_run_font_info(first_run)
            font_size = font_info.get("font_size_pt", 0)

            # Track largest font → name_style candidate
            if font_size > largest_font_size:
                largest_font_size = font_size
                largest_font_para = font_info

            # Bold + all caps → section_header_style candidate
            if font_info.get("bold") and text == text.upper() and len(text) < 50:
                if bold_caps_para is None:
                    bold_caps_para = font_info.copy()
                    bold_caps_para["all_caps"] = True
                    bold_caps_para["bottom_border"] = True

            # Bullet detection via paragraph numbering format
            pf = para.paragraph_format
            if pf.left_indent or (
                para._element.pPr is not None
                and para._element.pPr.find(
                    "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}numPr"
                )
                is not None
            ):
                if bullet_para is None and pf.left_indent:
                    bullet_para = {
                        "indent_left_dxa": _emu_to_dxa(pf.left_indent),
                        "hanging_dxa": _emu_to_dxa(pf.first_line_indent)
                        if pf.first_line_indent
                        else 180,
                        "space_after_pt": int(pf.space_after.pt)
                        if pf.space_after
                        else 2,
                    }

            # Count body fonts (non-bold, reasonable size)
            if not font_info.get("bold") and 8 <= font_size <= 14:
                key = (
                    font_info.get("font_name", "Calibri"),
                    font_size,
                    font_info.get("color_hex", "000000"),
                )
                body_fonts[key] += 1

        # Apply heuristic results
        if largest_font_para and largest_font_size > 0:
            styles["name_style"].update(largest_font_para)

        if bold_caps_para:
            for k, v in bold_caps_para.items():
                styles["section_header_style"][k] = v

        if body_fonts:
            most_common = body_fonts.most_common(1)[0][0]
            styles["body_style"]["font_name"] = most_common[0]
            styles["body_style"]["font_size_pt"] = most_common[1]
            styles["body_style"]["color_hex"] = most_common[2]

        if bullet_para:
            styles["bullet_style"].update(bullet_para)

        return styles

    except Exception:
        return copy.deepcopy(DEFAULT_STYLES)


def get_styles(user_id: str) -> dict:
    client = get_supabase_client()
    result = (
        client.table("documents")
        .select("styles_snapshot")
        .eq("user_id", user_id)
        .eq("file_type", "format_template")
        .limit(1)
        .execute()
    )

    if result.data and result.data[0].get("styles_snapshot"):
        return result.data[0]["styles_snapshot"]

    return copy.deepcopy(DEFAULT_STYLES)
