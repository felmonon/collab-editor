import {
  ArrowUpRight,
  FilePlus2,
  Loader2,
  NotebookPen,
  PanelsTopLeft,
} from "lucide-react";

export const documentTemplates = [
  {
    id: "blank",
    title: "Blank document",
    description: "A little space for a big idea.",
    icon: FilePlus2,
    color: "bg-[#eaf3f1] text-[#167d72]",
    documentTitle: "Untitled document",
    content: "",
  },
  {
    id: "brief",
    title: "Project brief",
    description: "Turn a direction into a plan.",
    icon: PanelsTopLeft,
    color: "bg-[#eef0f8] text-[#626a99]",
    documentTitle: "Project brief",
    content:
      "<h1>Project brief</h1><p>A shared starting point for your next project.</p><h2>Overview</h2><p>What are we building, and why does it matter?</p><h2>Goals</h2><ul><li><p>Define the outcome you want to achieve.</p></li><li><p>Describe how you will measure success.</p></li></ul><h2>Scope</h2><p>What is included? What will we leave for later?</p><h2>Milestones</h2><ol><li><p>Kickoff — align on the problem and the plan.</p></li><li><p>First draft — share early work for feedback.</p></li><li><p>Launch — review, refine, and deliver.</p></li></ol><h2>Open questions</h2><p>Capture the decisions your team still needs to make.</p>",
  },
  {
    id: "notes",
    title: "Meeting notes",
    description: "Keep decisions moving forward.",
    icon: NotebookPen,
    color: "bg-[#fbf1df] text-[#9a7133]",
    documentTitle: "Meeting notes",
    content:
      "<h1>Meeting notes</h1><p>Date: </p><p>Attendees: </p><h2>Purpose</h2><p>What do we want to accomplish together?</p><h2>Agenda</h2><ol><li><p>Updates and context</p></li><li><p>Discussion</p></li><li><p>Decisions and next steps</p></li></ol><h2>Discussion notes</h2><p>Capture key ideas here.</p><h2>Decisions</h2><ul><li><p>What did we agree on?</p></li></ul><h2>Action items</h2><ul><li><p>Action — owner — due date</p></li></ul>",
  },
];

export type DocumentTemplate = (typeof documentTemplates)[number];

export function DocumentTemplates({
  creating,
  onCreate,
}: {
  creating: string | null;
  onCreate: (template: DocumentTemplate) => void;
}) {
  return (
    <section aria-labelledby="start-writing-title" className="mt-9">
      <h2
        id="start-writing-title"
        className="mb-3 text-xs font-medium text-slate-500"
      >
        Start with a little structure
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {documentTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={creating !== null}
            onClick={() => onCreate(template)}
            className="focus-ring group flex items-center gap-3.5 rounded-xl border border-[#e2e7e9] bg-white p-4 text-left transition-colors hover:border-[#9ec4bc] hover:bg-[#fcfefd] disabled:cursor-wait disabled:opacity-60"
          >
            <span
              className={`flex h-11 w-10 shrink-0 items-center justify-center rounded-lg ${template.color}`}
            >
              {creating === template.id ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <template.icon className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {creating === template.id ? "Creating…" : template.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {template.description}
              </span>
            </span>
            <ArrowUpRight
              className="ml-auto hidden h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#167d72] xl:block"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
