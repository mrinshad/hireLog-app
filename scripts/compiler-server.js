/**
 * Companion Local LaTeX Compilation Microservice
 * Run with: node scripts/compiler-server.js
 * Accepts POST /compile with { latex: "..." } and compiles using pdflatex or tectonic.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.COMPILER_PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'hirelog-latex-compiler' }));
    return;
  }

  if (req.url === '/compile' && (req.method === 'POST' || req.method === 'GET')) {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let latexCode = '';
      try {
        if (body.startsWith('{')) {
          const parsed = JSON.parse(body);
          latexCode = parsed.latex || parsed.text || '';
        } else {
          latexCode = body;
        }
      } catch {
        latexCode = body;
      }

      if (!latexCode.trim()) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Empty LaTeX source provided.');
        return;
      }

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hirelog-tex-'));
      const texPath = path.join(tempDir, 'resume.tex');
      const pdfPath = path.join(tempDir, 'resume.pdf');
      const logPath = path.join(tempDir, 'resume.log');

      fs.writeFileSync(texPath, latexCode, 'utf8');

      // Try pdflatex or tectonic
      const compileCmd = `pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texPath}" || tectonic -o "${tempDir}" "${texPath}"`;

      exec(compileCmd, (err) => {
        if (fs.existsSync(pdfPath)) {
          const pdfBuffer = fs.readFileSync(pdfPath);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
          });
          res.end(pdfBuffer);
          // Cleanup
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {}
        } else {
          let logContent = 'Compilation failed.';
          if (fs.existsSync(logPath)) {
            logContent = fs.readFileSync(logPath, 'utf8');
          }
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(logContent);
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {}
        }
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found. POST /compile with LaTeX source.');
});

server.listen(PORT, () => {
  console.log(`HireLog LaTeX Companion Compiler running on http://localhost:${PORT}`);
});
