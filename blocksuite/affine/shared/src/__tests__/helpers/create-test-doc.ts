import {
  BlockSchemaExtension,
  defineBlockSchema,
  type Store,
  Text,
} from '@blocksuite/store';
import { TestWorkspace } from '@blocksuite/store/test';
import { type Element as HappyDOMElement, Window } from 'happy-dom';

// Define schema
const PageBlockSchema = defineBlockSchema({
  flavour: 'affine:page',
  props: () => ({}),
  metadata: {
    version: 1,
    role: 'root',
    children: ['affine:note'],
  },
});

const NoteBlockSchema = defineBlockSchema({
  flavour: 'affine:note',
  props: () => ({}),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['affine:page'],
    children: ['affine:paragraph'],
  },
});

const ParagraphBlockSchema = defineBlockSchema({
  flavour: 'affine:paragraph',
  props: internal => ({
    text: internal.Text(),
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
  },
});

// Create schema extensions
const PageBlockSchemaExtension = BlockSchemaExtension(PageBlockSchema);
const NoteBlockSchemaExtension = BlockSchemaExtension(NoteBlockSchema);
const ParagraphBlockSchemaExtension =
  BlockSchemaExtension(ParagraphBlockSchema);

// Extensions array
const extensions = [
  PageBlockSchemaExtension,
  NoteBlockSchemaExtension,
  ParagraphBlockSchemaExtension,
];

/**
 * Parse HTML string and create document block structure
 * @param node Current DOM node
 * @param doc Document object
 * @param parentId Parent block ID
 * @returns Created block ID
 */
function processNode(
  node: HappyDOMElement,
  doc: Store,
  parentId?: string
): string | undefined {
  // Skip text nodes and comments
  if (node.nodeType !== 1) {
    return undefined;
  }

  const tagName = node.tagName.toLowerCase();
  let blockId: string | undefined = undefined;

  // Create appropriate block based on tag name
  if (tagName === 'affine-page') {
    blockId = doc.addBlock('affine:page', {}, parentId);
  } else if (tagName === 'affine-note') {
    blockId = doc.addBlock('affine:note', {}, parentId);
  } else if (tagName === 'affine-paragraph') {
    // Get paragraph text content
    const textContent = node.textContent || '';
    // Get attributes
    const props: Record<string, any> = { text: new Text(textContent) };

    // Process custom attributes
    for (const attr of Array.from(node.attributes)) {
      if (attr.name === 'type') {
        props.type = attr.value;
      } else if (attr.name === 'checked' && attr.value === 'true') {
        props.checked = true;
      }
    }

    blockId = doc.addBlock('affine:paragraph', props, parentId);
  } else {
    console.warn(`Unknown tag name: ${tagName}`);
    return undefined;
  }

  // Process child nodes
  for (const childNode of Array.from(node.children) as HappyDOMElement[]) {
    processNode(childNode, doc, blockId);
  }

  return blockId;
}

/**
 * Create document from HTML string
 * @param template HTML template string
 * @returns Created document object
 */
export function createDocFromHTML(template: string) {
  const workspace = new TestWorkspace({});
  workspace.meta.initialize();

  const doc = workspace.createDoc({ id: 'test-doc', extensions });

  doc.load(() => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement('div');
    container.innerHTML = template;

    // Process each child node of the root
    for (const childNode of Array.from(container.children)) {
      processNode(childNode, doc);
    }
  });

  return doc;
}
