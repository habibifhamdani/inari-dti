import { EditionExperience } from "@/components/EditionExperience";

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EditionExperience slug={slug} />;
}
