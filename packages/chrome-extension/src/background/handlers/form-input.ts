import { resolveTabId } from './group-utils';

export async function handleFormInput(args: Record<string, unknown>): Promise<{
  success: boolean;
  field?: { tag: string; type: string; name: string };
}> {
  const selector = args.selector as string;
  const value = args.value as string;
  const clear = args.clear !== false;

  if (!selector) throw new Error('Selector is required');
  if (value === undefined) throw new Error('Value is required');

  const tabId = await resolveTabId(args);

  // For file inputs, the caller passes a base64-encoded payload as value
  // (optionally prefixed with "data:<mime>;base64,"). We decode it inside
  // the page and use DataTransfer to fill the input — same shape as a
  // real drag&drop or file picker, so React / Formik / react-hook-form
  // pick it up like a user upload. fileName is optional via the args.
  const fileName = (args.fileName as string | undefined) ?? 'upload.bin';
  const fileMime = (args.fileMime as string | undefined) ?? 'application/octet-stream';

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel: string, val: string, clr: boolean, fName: string, fMime: string) => {
      const el = document.querySelector(sel);
      if (!el) return { success: false, error: `Element not found: ${sel}` };

      const tag = el.tagName.toLowerCase();
      const inputType = (el as HTMLInputElement).type || '';
      const name = (el as HTMLInputElement).name || '';

      if (tag === 'select') {
        (el as HTMLSelectElement).value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (inputType === 'checkbox' || inputType === 'radio') {
        // For toggles, do NOT set .checked directly — that bypasses the
        // React onChange handler and the form state stays out of sync.
        // Click the associated label (wrapping <label> OR external
        // label[for=id], common on Teamtailor/Vroomly/Hublo). Fall back
        // to clicking the input itself if no label exists. Skip when the
        // desired state already matches.
        const shouldCheck = val === 'true' || val === '1' || val === 'on' || val === '';
        const inp = el as HTMLInputElement;
        if (inp.checked !== shouldCheck) {
          const wrapLabel = inp.closest('label') as HTMLElement | null;
          const externalLabel = inp.id
            ? document.querySelector(`label[for="${inp.id}"]`) as HTMLElement | null
            : null;
          const target = wrapLabel ?? externalLabel;
          if (target) {
            target.click();
          } else {
            inp.click();
          }
          // Verify it flipped — if not, the click didn't fire the React
          // onChange handler. Try a synthetic change event as last resort.
          if (inp.checked !== shouldCheck) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
            if (setter) setter.call(inp, shouldCheck);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } else if (inputType === 'file') {
        // Decode base64 → ArrayBuffer → Blob → File → DataTransfer.
        const cleaned = val.replace(/^data:[^;]+;base64,/, '');
        let bytes: Uint8Array;
        try {
          const bin = atob(cleaned);
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch {
          return { success: false, error: 'file value is not valid base64' };
        }
        const file = new File([bytes.buffer as ArrayBuffer], fName, { type: fMime });
        const dt = new DataTransfer();
        dt.items.add(file);
        (el as HTMLInputElement).files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          success: true,
          field: { tag, type: inputType, name, fileName: fName, size: bytes.length },
        };
      } else {
        // Text input, textarea, etc. — native setter so React/Vue/Angular notice.
        const nativeSetter = Object.getOwnPropertyDescriptor(
          tag === 'textarea'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeSetter) {
          if (clr) {
            nativeSetter.call(el, '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          nativeSetter.call(el, val);
        } else {
          (el as HTMLInputElement).value = val;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return {
        success: true,
        field: { tag, type: inputType, name },
      };
    },
    args: [selector, value, clear, fileName, fileMime],
  });

  const result = results[0]?.result as { success: boolean; error?: string; field?: { tag: string; type: string; name: string } } | undefined;
  if (!result?.success) throw new Error(result?.error || 'Failed to fill form field');

  return { success: true, field: result.field };
}
