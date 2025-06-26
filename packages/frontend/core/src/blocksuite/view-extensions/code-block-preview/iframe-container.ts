import type { CodeBlockModel } from '@blocksuite/affine/model';

export function linkIframe(iframe: HTMLIFrameElement, model: CodeBlockModel) {
  const html = model.props.text.toString();
  // force reload iframe
  iframe.src = '';
  iframe.src = 'https://affine.run/static/container.html';
  iframe.sandbox.add(
    'allow-pointer-lock',
    'allow-popups',
    'allow-forms',
    'allow-popups-to-escape-sandbox',
    'allow-downloads',
    'allow-scripts',
    'allow-same-origin'
  );
  iframe.onload = () => {
    iframe.contentWindow?.postMessage(html, 'https://affine.run');
  };
}
