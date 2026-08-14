import MarkdownViewer from "@/components/docs/MarkdownViewer";
import { notFound } from "next/navigation";
import fs from "fs/promises";
import path from "path";

const SLUG_PATTERN = /^[a-z0-9-]+$/i;

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) {
    notFound();
  }

  const filePath = path.join(
    process.cwd(),
    "docs",
    `${slug}.md`
  );

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    notFound();
  }

  return (
    <div className="p-10">
      <MarkdownViewer content={content}/>
    </div>
  );
}
