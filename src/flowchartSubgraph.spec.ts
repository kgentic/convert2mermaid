import { describe, expect, it } from 'vitest';
import { parseData } from './parser/parser.js';
import { generateMermaidCode } from './scribe.js';

// tests/FlowchartContainers.drawio is an architecture flowchart exported from draw.io: eleven shapes, one of which
// (`sys`) sits inside a swimlane container (`stack`), and fourteen labelled edges (thirteen distinct pairs), eight of them touching `sys`.
// Before this fix the container swallowed `sys` as if it were a class attribute, so those eight edges pointed at a
// node that was never declared.
describe('Flowchart containers', () => {
  it('emits a draw.io swimlane that holds connected shapes as a subgraph, keeping every edge', async () => {
    const diagram = await parseData('tests/FlowchartContainers.drawio');
    expect(diagram).toBeDefined();
    if (!diagram) {
      throw new Error('Failed to parse container fixture');
    }

    const mermaid = generateMermaidCode(diagram);

    expect(mermaid).toMatch(/^flowchart TD/);
    // The container is a subgraph, labelled, and the contained node is declared inside it.
    expect(mermaid).toContain('subgraph n0stack["Dark-factory stack (this repository)"]');
    expect(mermaid).toMatch(/subgraph n0stack\[[^\]]*\]\r\n  n0sys\("Routing \+ workflow guard<br\/>\+ launcher \+ evidence"\)\r\nend/);
    // The container is not also emitted as a node, and its label does not absorb the child's text.
    expect(mermaid).not.toContain('n0stack["Dark-factory stack (this repository)<br/>---');
    expect(mermaid).not.toMatch(/\r\nn0stack\[/);
    // Every edge that touches the contained node survives, in both directions.
    expect(mermaid).toContain('n0orch -->|darkfactory launch| n0sys');
    expect(mermaid).toContain('n0sys -->|starts Agent SDK sessions| n0cc');
    expect(mermaid).toContain('n0cc -->|hook events| n0sys');
    expect(mermaid).toContain('n0tg -->|tap, typed message| n0sys');
    const edgeLines = mermaid.split('\r\n').filter((line) => line.includes('-->'));
    expect(edgeLines).toHaveLength(14);
  });

  it('still folds class members (text and line cells no edge connects to) into the class', async () => {
    const diagram = await parseData('tests/classDiagram_kanban_board.drawio');
    expect(diagram).toBeDefined();
    if (!diagram) {
      throw new Error('Failed to parse class fixture');
    }

    const mermaid = generateMermaidCode(diagram);

    expect(mermaid).toMatch(/^classDiagram/);
    expect(mermaid).not.toContain('subgraph');
  });
});
