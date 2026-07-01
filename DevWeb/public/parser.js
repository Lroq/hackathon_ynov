// MARK: Custom Markdown Parser
function formatMarkdown(text) {
  if (!text) return '';
  
  const escapeHTML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // MARK: Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map(part => {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const firstLine = lines[0].slice(3).trim(); // e.g. "python"
      const codeLines = lines.slice(1, -1);
      const code = escapeHTML(codeLines.join('\n'));
      
      const langClass = firstLine ? `class="language-${firstLine}"` : '';
      return `<pre><code ${langClass}>${code}</code></pre>`;
    } else {
      const lines = part.split('\n');
      let inUnorderedList = false;
      let inOrderedList = false;
      const parsedLines = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let escapedLine = escapeHTML(line);

        const unorderedMatch = escapedLine.match(/^(\s*)[*\-]\s+(.*)/);
        const orderedMatch = escapedLine.match(/^(\s*)\d+\.\s+(.*)/);

        if (unorderedMatch) {
          if (inOrderedList) {
            inOrderedList = false;
            parsedLines.push('</ol>');
          }
          if (!inUnorderedList) {
            inUnorderedList = true;
            parsedLines.push('<ul>');
          }
          parsedLines.push(`<li>${processInlineMarkdown(unorderedMatch[2])}</li>`);
        } else if (orderedMatch) {
          if (inUnorderedList) {
            inUnorderedList = false;
            parsedLines.push('</ul>');
          }
          if (!inOrderedList) {
            inOrderedList = true;
            parsedLines.push('<ol>');
          }
          parsedLines.push(`<li>${processInlineMarkdown(orderedMatch[2])}</li>`);
        } else {
          if (inUnorderedList) {
            inUnorderedList = false;
            parsedLines.push('</ul>');
          }
          if (inOrderedList) {
            inOrderedList = false;
            parsedLines.push('</ol>');
          }

          const trimmed = escapedLine.trim();
          if (trimmed === '') {
            parsedLines.push('');
          } else if (trimmed.startsWith('### ')) {
            parsedLines.push(`<h3>${processInlineMarkdown(trimmed.substring(4))}</h3>`);
          } else if (trimmed.startsWith('## ')) {
            parsedLines.push(`<h2>${processInlineMarkdown(trimmed.substring(3))}</h2>`);
          } else if (trimmed.startsWith('# ')) {
            parsedLines.push(`<h1>${processInlineMarkdown(trimmed.substring(2))}</h1>`);
          } else {
            parsedLines.push(`<p>${processInlineMarkdown(escapedLine)}</p>`);
          }
        }
      }

      if (inUnorderedList) parsedLines.push('</ul>');
      if (inOrderedList) parsedLines.push('</ol>');

      return parsedLines.filter(line => line !== '').join('\n');
    }
  }).join('');
}

function processInlineMarkdown(text) {
  let res = text;
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  res = res.replace(/_(.*?)_/g, '<em>$1</em>');
  res = res.replace(/`(.*?)`/g, '<code>$1</code>');
  res = res.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return res;
}
