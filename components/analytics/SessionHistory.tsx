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

type SessionRow = {
  id: string;
  mode: string;
  correct: number;
  total: number;
  percent: number;
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
        {sessions.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <LocalDateTime value={s.ended_at ?? s.started_at} variant="short" />
            </TableCell>
            <TableCell className="capitalize text-muted-foreground">{s.mode}</TableCell>
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
