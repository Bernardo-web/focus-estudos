import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link href="/" className="text-sm text-brand-700">← Voltar</Link>
      <h1 className="text-2xl font-bold tracking-tight">Privacidade no Focus</h1>
      <p className="muted text-sm">
        O Focus é um projeto pessoal, usado por convite. Esta página explica, sem juridiquês, o que é guardado e como.
      </p>
      <section className="space-y-2">
        <h2 className="font-semibold">O que é guardado</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Seu nome e e-mail, para o login.</li>
          <li>O que você cadastra: concursos, matérias, cronograma, sessões de estudo, revisões, simulados e metas.</li>
          <li>As imagens de brasão que você envia. Elas ficam numa pasta privada da sua conta; ninguém mais as vê.</li>
          <li>Se você ativar os lembretes, o endereço de notificação do seu navegador (não identifica você fora do Focus).</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Quem vê seus dados</h2>
        <p className="text-sm">
          Só você. Cada linha do banco é ligada à sua conta e o próprio banco bloqueia o acesso de outras pessoas,
          inclusive de quem administra o app.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Excluir tudo</h2>
        <p className="text-sm">Em Configurações você exclui a conta, e todos os seus dados e imagens são apagados na hora.</p>
      </section>
    </main>
  );
}
