import { findOrg } from "@/lib/catalog";
import type { Exam } from "@/lib/types";

/** Brasão do concurso: a imagem enviada pelo usuário ou, sem imagem, um escudo com a sigla. */
export function Crest({
  exam,
  url,
  size = 56,
  className = "",
}: {
  exam: Pick<Exam, "name" | "color" | "org_key">;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Brasão ${exam.name}`}
        width={size}
        height={size}
        className={`shrink-0 object-contain drop-shadow-sm ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const label = (findOrg(exam.org_key)?.short ?? exam.name).slice(0, 6).toUpperCase();
  const font = label.length <= 3 ? 28 : label.length <= 4 ? 21 : label.length <= 5 ? 17 : 14;
  return (
    <svg viewBox="0 0 100 112" width={size} height={size * 1.12} className={`shrink-0 ${className}`} aria-label={`Brasão ${exam.name}`} role="img">
      <path d="M50 4 L92 18 V54 C92 82 74 100 50 108 C26 100 8 82 8 54 V18 Z" fill={exam.color} />
      <path d="M50 11 L85 23 V54 C85 77 70 92 50 100 C30 92 15 77 15 54 V23 Z" fill="none" stroke="#e0a82e" strokeWidth="3" />
      <text x="50" y="62" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontWeight="800" fontSize={font} fill="#fff" letterSpacing="0.5">
        {label}
      </text>
    </svg>
  );
}
