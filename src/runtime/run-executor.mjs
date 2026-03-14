import { getTemplateRenderer } from "./template-registry.mjs";

export async function executeRun(context) {
  const templateId = context.skill.template ?? context.skill.id;
  const renderer = await getTemplateRenderer(templateId);
  if (typeof renderer !== "function") {
    throw new Error(`No renderer available for template: ${templateId}`);
  }
  return renderer(context);
}
