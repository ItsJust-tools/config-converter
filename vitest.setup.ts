import '@testing-library/jest-dom/vitest';

// Prevent jsdom navigation errors from anchor clicks in export tests
const originalClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
  if (this.href?.startsWith('blob:')) {
    return;
  }
  return originalClick.call(this);
};

if (!Blob.prototype.text) {
  Object.defineProperty(Blob.prototype, 'text', {
    value: function text(this: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    },
    writable: true,
    configurable: true,
  });
}
