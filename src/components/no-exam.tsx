import Link from "next/link";
import { Landmark } from "lucide-react";

export function NoExam() {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <div className="rounded-full bg-brand-50 p-3 text-brand-700 dark:bg-brand-800/30 dark:text-brand-100"><Landmark className="size-6" /></div>
      <h1 className="text-lg font-semibold">Cadastre seu concurso</h1>
      <p className="muted text-sm">Comece pelo concurso que você está estudando. Dá para usar o modelo pronto da PMAL.</p>
      <Link href="/concursos/novo" className="btn-primary">Cadastrar concurso</Link>
    </div>
  );
}
