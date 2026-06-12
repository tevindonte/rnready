import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SessionRow = {
  id: string;
  mode: string;
  correct: number;
  total_questions: number | null;
  ended_at: string | null;
  started_at: string;
};

export function SessionHistory({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed sessions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Questions</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => {
          const total = s.total_questions ?? 0;
          const pct = total > 0 ? Math.round((s.correct / total) * 100) : 0;
          return (
            <TableRow key={s.id}>
              <TableCell>
                {new Date(s.ended_at ?? s.started_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">{s.mode}</TableCell>
              <TableCell>{pct}%</TableCell>
              <TableCell>{total}</TableCell>
              <TableCell>
                <Link href={`/quiz/${s.id}/review`} className="text-sm text-primary hover:underline">
                  Review
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
