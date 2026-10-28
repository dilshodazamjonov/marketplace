const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an element. String children become text nodes and are never parsed as HTML, so data
 * from the API can't inject markup. Attributes that are null/false are skipped; functions
 * (onclick, oninput, ...) become event listeners.
 */
export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue;
    if (typeof value === 'function') node.addEventListener(name.replace(/^on/, ''), value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  node.append(...children.filter((child) => child != null && child !== false));
  return node;
}

/** A decorative icon from the sprite in /assets/icons.svg. */
export function icon(name, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `/assets/icons.svg#${name}`);
  svg.append(use);
  return svg;
}

/** A stable hue (0-359) for a string, so the same name always gets the same colour. */
export function hueFor(text) {
  let hash = 0;
  for (const char of String(text)) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return Math.abs(hash) % 360;
}
