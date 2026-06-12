"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocalDateTime } from "@/components/LocalDateTime";
import { getSessionDisplayName } from "@/lib/session-display";

type SessionRow = {
  id: string;
  mode: string;
  title?: string | null;
  started_at: string;
  correct: number;
  total: number;
  percent: number;
  ended_at: string | null;
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
          <TableHead>Session</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Result</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <LocalDateTime value={s.ended_at ?? s.started_at} variant="short" />
            </TableCell>
            <TableCell>
              <p className="text-sm font-medium text-foreground">{getSessionDisplayName(s)}</p>
              <p className="text-xs capitalize text-muted-foreground">{s.mode}</p>
            </TableCell>
            <TableCell>{s.percent}%</TableCell>
            <TableCell>
              {s.correct}/{s.total}
            </TableCell>
            <TableCell>
              <Link href={`/quiz/${s.id}/review`} className="text-sm text-primary hover:underline">
                Review
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
