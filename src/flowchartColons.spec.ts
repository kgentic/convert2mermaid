import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { deflateRawSync } from 'zlib';
import { parseData } from './parser/parser.js';
import { generateMermaidCode } from './scribe.js';
import { sanitizeLabel, sanitizeFlowchartLabel } from './utils/labelUtils.js';

const convert = async (mxGraphModel: string): Promise<string> => {
  const compressed = deflateRawSync(Buffer.from(encodeURIComponent(mxGraphModel), 'utf-8')).toString('base64');
  const testFile = path.join(os.tmpdir(), `convert2mermaid-colon-${Date.now()}.drawio`);
  fs.writeFileSync(testFile, `<mxfile><diagram>${compressed}</diagram></mxfile>`);
  try {
    const diagram = await parseData(testFile);
    if (!diagram) {
      throw new Error('Failed to parse colon fixture');
    }
    return generateMermaidCode(diagram);
  } finally {
    fs.rmSync(testFile, { force: true });
  }
};

describe('Flowchart labels keep colons', () => {
  it('keeps colons in node and edge labels', async () => {
    const mermaidCode = await convert(
      '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
        '<mxCell id="a" value="aidocs:plan" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1"/>' +
        '<mxCell id="b" value="planning:next" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1"/>' +
        '<mxCell id="e" value="hand-off: tasks" style="endArrow=classic;html=1;" edge="1" parent="1" source="a" target="b"/>' +
        '</root></mxGraphModel>'
    );

    expect(mermaidCode).toMatch(/^flowchart TD/);
    expect(mermaidCode).toContain('n0a["aidocs:plan"]');
    expect(mermaidCode).toContain('n0b["planning:next"]');
    expect(mermaidCode).toContain('n0a -->|hand-off: tasks| n0b');
  });

  it('still strips colons for the diagram types that need it', () => {
    expect(sanitizeLabel('a:b')).toBe('ab');
    expect(sanitizeFlowchartLabel('a:b')).toBe('a:b');
  });
});
