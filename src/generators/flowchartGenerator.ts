import { Diagram, Shape } from '../types.js';
import {
  shapeToNode,
  shapeToConnector,
  NodeRecord,
  sanitizeEdgeLabel,
  sanitizeLabel,
  escapeFlowchartLabel,
} from '../utils/labelUtils.js';
import { getStyleStatement, buildEdgeStatement } from '../utils/styleUtils.js';

const LINE_BREAK = '\r\n';

export const generateFlowchartDiagram = (diagram: Diagram): string => {
  const nodes: NodeRecord[] = [];
  const edges: Shape[] = [];
  const styles: string[] = [];

  for (const shape of diagram.Shapes) {
    if (shape.IsEdge) {
      edges.push(shapeToConnector(shape));
    } else {
      nodes.push(shapeToNode(shape));
    }
  }

  // A node that is the parent of other nodes is a container: it is emitted as a subgraph holding its children,
  // not as a node. Any node whose parent is not itself a node is a root.
  const nodeIds = new Set(nodes.map((node) => node.Shape.Id));
  const childrenOf = new Map<string, NodeRecord[]>();
  const roots: NodeRecord[] = [];
  for (const node of nodes) {
    const parentId = node.Shape.ParentNode || '';
    if (parentId && nodeIds.has(parentId) && parentId !== node.Shape.Id) {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(node);
      childrenOf.set(parentId, siblings);
    } else {
      roots.push(node);
    }
  }

  const lines: string[] = [];
  const emit = (node: NodeRecord, depth: number): void => {
    const indent = '  '.repeat(depth);
    const children = childrenOf.get(node.Shape.Id);
    if (children && children.length > 0) {
      const label = escapeFlowchartLabel(sanitizeLabel(node.Shape.Label) || ' ');
      lines.push(`${indent}subgraph ${node.ID}["${label}"]`);
      children.forEach((child) => emit(child, depth + 1));
      lines.push(`${indent}end`);
    } else {
      lines.push(`${indent}${node.NodeDef}`);
    }
    const nodeStyle = getStyleStatement(node.Shape.Style);
    if (nodeStyle) {
      styles.push(`style ${node.ID} ${nodeStyle}`);
    }
  };
  roots.forEach((root) => emit(root, 0));

  let mermaidSyntax = 'flowchart TD' + LINE_BREAK + lines.join(LINE_BREAK);

  const edgeCount = edges.length;
  let index = 0;

  if (edgeCount > 0) {
    mermaidSyntax += LINE_BREAK;
    edges.forEach((edge) => {
      const edgeStart = `${edge.FromNode}`;
      const edgeEnd = `${edge.ToNode}`;
      if (!edgeStart || !edgeEnd) {
        return;
      }

      const edgeStatement = buildEdgeStatement(edgeStart, edgeEnd, edge.Style, edge.Label, sanitizeEdgeLabel);
      mermaidSyntax += edgeStatement;

      if (index < edgeCount - 1) {
        mermaidSyntax += LINE_BREAK;
      }

      const linkStyle = getStyleStatement(edge.Style);
      if (linkStyle) {
        styles.push(`linkStyle ${index} ${linkStyle}`);
      }
      index++;
    });
  }

  if (styles.length > 0) {
    mermaidSyntax += LINE_BREAK;
    styles.forEach((style) => {
      mermaidSyntax += style + LINE_BREAK;
    });
  }

  return mermaidSyntax;
};
