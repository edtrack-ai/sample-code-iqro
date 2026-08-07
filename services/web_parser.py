import requests
import re
import html as html_lib

def extract_clean_web_content(url: str) -> str:
    """
    Fetches the web page content and removes HTML tags, scripts, and styling
    to return a clean body of text for AI processing.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Resolve encoding issues
        if response.encoding is None or response.encoding == 'ISO-8859-1':
            response.encoding = response.apparent_encoding
            
        html = response.text
        
        # 1. Remove script, style, head, nav, footer, iframe tags and their content
        html = re.sub(r'<(script|style|head|nav|footer|iframe|noscript)[^>]*>([\s\S]*?)<\/\1>', '', html, flags=re.IGNORECASE)
        
        # 2. Replace paragraph/block tags with newlines
        html = re.sub(r'</?(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article|header)[^>]*>', '\n', html, flags=re.IGNORECASE)
        
        # 3. Strip all other HTML tags
        text = re.sub(r'<[^>]+>', ' ', html)
        
        # 4. Decode HTML entities (e.g. &amp;, &nbsp;)
        text = html_lib.unescape(text)
        
        # 5. Clean up whitespaces
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        cleaned_text = '\n'.join(lines)
        
        return cleaned_text
    except Exception as e:
        return f"Error extracting content from URL {url}: {str(e)}"
