import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deal Workflow",
};

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
