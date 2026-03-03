/**
 * Math — KaTeX-based formula renderer
 *
 * Usage:
 *   <Math latex="C = SN(d_1) - Ke^{-r\tau}N(d_2)" />          // inline
 *   <Math latex="\sigma^2_p = \mathbf{w}^\top\Sigma\mathbf{w}" display />  // block
 *   <MathBlock latex="..." />  // shorthand for display mode
 *   <MathInline latex="..." /> // shorthand for inline mode
 */
import { useMemo } from 'react';
import katex from 'katex';

interface MathProps {
  latex: string;
  display?: boolean;
  className?: string;
  errorColor?: string;
}

export const Math = ({ latex, display = false, className = '', errorColor = '#f87171' }: MathProps) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: display,
        output: 'html',
        errorColor,
        trust: false,
        strict: 'ignore',
      });
    } catch {
      return `<span style="color:${errorColor}">${latex}</span>`;
    }
  }, [latex, display, errorColor]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/** Block-level (display mode) formula — centred, larger */
export const MathBlock = ({ latex, className = '' }: { latex: string; className?: string }) => (
  <Math latex={latex} display className={`block text-center py-1 ${className}`} />
);

/** Inline formula — flows with surrounding text */
export const MathInline = ({ latex, className = '' }: { latex: string; className?: string }) => (
  <Math latex={latex} display={false} className={className} />
);
