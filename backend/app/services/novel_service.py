# e:\Vs_Project\Novel_asisit\backend\app\services\novel_service.py
import re
from enum import Enum, auto

# --- 用于表示章节标题模式的枚举 ---
class PatternType(Enum):
    CHINESE_NUMERIC = auto()  # "第...章" 模式
    ARABIC_NUMERIC = auto()   # "100 ..." 模式
    ENGLISH = auto()          # "Chapter 1" 模式
    UNKNOWN = auto()          # 未知或初始模式

# --- 中文数字到阿拉伯数字的转换 ---
CHINESE_NUM_MAP = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000, '万': 10000
}

def _chinese_to_arabic(cn_num):
    if not cn_num: return 0
    if cn_num.isdigit(): return int(cn_num)
    total = 0
    unit = 1 
    temp_val = 0
    for i in range(len(cn_num) - 1, -1, -1):
        val = CHINESE_NUM_MAP.get(cn_num[i])
        if val >= 10:
            if val > unit: unit = val
            else: unit = val * unit
        else:
            temp_val += val * unit
    total += temp_val
    return total

def _extract_chapter_number(title_line):
    match = re.search(r'^第([一二三四五六七八九十零百千万\d]+)[章节卷集篇]', title_line)
    if match: return _chinese_to_arabic(match.group(1))
    match = re.search(r'^(Chapter|CHAPTER)\s*(\d+)', title_line)
    if match: return int(match.group(2))
    match = re.search(r'^(\d+)', title_line)
    if match: return int(match.group(1))
    return None

def split_chapters(text):
    chapters = []
    if not text or len(text.strip()) == 0: return chapters

    last_pattern_type = PatternType.UNKNOWN
    last_chapter_number = 0

    chapter_patterns = [
        (PatternType.CHINESE_NUMERIC, r'^第[一二三四五六七八九十零百千万\d]+[章节卷集篇]\s*.*$'),
        (PatternType.ENGLISH, r'^(Chapter|CHAPTER)\s+\d+\s*.*$'),
        (PatternType.ARABIC_NUMERIC, r'^\d+\s*.*$'),
    ]

    def is_valid_title_in_context(line, potential_type):
        if potential_type in [PatternType.CHINESE_NUMERIC, PatternType.ENGLISH]: return True
        if potential_type == PatternType.ARABIC_NUMERIC:
            # 排除 Markdown 列表项（如 "1. 主要人物"、"2. 剧情发展"）
            if re.match(r'^\d+\.\s', line):
                return False
            # 排除过长的行或包含标点符号的行（不太可能是章节标题）
            if len(line) > 60 or '，' in line or '。' in line: return False
            current_number = _extract_chapter_number(line)
            if current_number is None: return False
            if last_chapter_number == 0 and current_number == 1: return True
            diff = current_number - last_chapter_number
            if 0 < diff < 5: return True
            else: return False
        return False

    lines = text.split('\n')
    current_chapter = None
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_chapter: current_chapter["content"] += "\n"
            continue
            
        is_chapter_title = False
        matched_pattern_type = PatternType.UNKNOWN

        for p_type, pattern in chapter_patterns:
            if re.match(pattern, line):
                if is_valid_title_in_context(line, p_type):
                    is_chapter_title = True
                    matched_pattern_type = p_type
                    break
        
        if is_chapter_title:
            if current_chapter: chapters.append(current_chapter)
            current_number = _extract_chapter_number(line) or (last_chapter_number + 1)
            current_chapter = { "title": line, "content": "", "number": current_number }
            last_pattern_type = matched_pattern_type
            last_chapter_number = current_number
        else:
            if current_chapter is None:
                current_chapter = { "title": "前言", "content": "", "number": 0 }
            current_chapter["content"] += line + "\n"
    
    if current_chapter: chapters.append(current_chapter)
    if not chapters and text.strip():
        chapters = [{"title": "全文", "content": text, "number": 1}]
    
    print(f"分割出 {len(chapters)} 个章节")
    return chapters

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions
