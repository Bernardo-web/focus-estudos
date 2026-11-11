import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { pickExam } from "@/lib/data";
import { toAnki, REASONS } from "@/lib/anki";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Baixa o caderno de erros para importar no Anki e marca os cartões como exportados. */
export async function GET(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));
  const exam = await pickExam();
  if (!exam) return NextResponse.redirect(new URL("/concursos/novo", request.url));
  const all = request.nextUrl.searchParams.get("todos") === "1";

  let query = supabase
    .from("error_notes")
    .select("id, statement, answer, bizu, reason, subjects(name), topics(name)")
    .eq("exam_id", exam.id)
    .order("created_at");
  if (!all) query = query.is("exported_at", null);
  const { data } = await query;
  const notes = (data ?? []) as unknown as {
    id: string; statement: string; answer: string; bizu: string | null; reason: string;
    subjects: { name: string } | null; topics: { name: string } | null;
  }[];

  const body = toAnki(
    notes.map((n) => ({
      statement: n.statement,
      answer: n.answer,
      bizu: n.bizu,
      tags: ["Focus", exam.name, n.subjects?.name ?? "", n.topics?.name ?? "", REASONS[n.reason] ? n.reason : ""],
    })),
  );
  if (notes.length) {
    await supabase.from("error_notes").update({ exported_at: new Date().toISOString() }).in("id", notes.map((n) => n.id));
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="focus-erros-${exam.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today()}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
