import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'dY\W* Coastal Sector', 'Coastal Sector', content)
content = re.sub(r'dY"\?\s*Coastal Sector', 'Coastal Sector', content)
content = re.sub(r'Coastal Sector', 'Coastal Sector', content) # fallback

# I can just use a generic regex to remove emojis / corrupted text
# Instead, let's just replace the specific line.
content = re.sub(r'<span className="telemetry-label">.*?Coastal Sector</span>', '<span className="telemetry-label">Coastal Sector</span>', content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
