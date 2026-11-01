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
    color: "bg-[#eaf0ff] text-[#315bee]",
    documentTitle: "Untitled document",
    content: "",
  },
  {
    id: "brief",
    title: "Project brief",
    description: "Turn a direction into a plan.",
    icon: PanelsTopLeft,
    color: "bg-[#f0edfc] text-[#7b61c9]",
    documentTitle: "Project brief",
    content:
      "<h1>Project brief</h1><p>A shared starting point for your next project.</p><h2>Overview</h2><p>What are we building, and why does it matter?</p><h2>Goals</h2><ul><li><p>Define the outcome you want to achieve.</p></li><li><p>Describe how you will measure success.</p></li></ul><h2>Scope</h2><p>What is included? What will we leave for later?</p><h2>Milestones</h2><ol><li><p>Kickoff — align on the problem and the plan.</p></li><li><p>First draft — share early work for feedback.</p></li><li><p>Launch — review, refine, and deliver.</p></li></ol><h2>Open questions</h2><p>Capture the decisions your team still needs to make.</p>",
  },
  {
    id: "notes",
    title: "Meeting notes",
    description: "Keep decisions moving forward.",
    icon: NotebookPen,
    color: "bg-[#fff2e7] text-[#bd7945]",
    documentTitle: "Meeting notes",
    content:
      "<h1>Meeting notes</h1><p>Date: </p><p>Attendees: </p><h2>Purpose</h2><p>What do we want to accomplish together?</p><h2>Agenda</h2><ol><li><p>Updates and context</p></li><li><p>Discussion</p></li><li><p>Decisions and next steps</p></li></ol><h2>Discussion notes</h2><p>Capture key ideas here.</p><h2>Decisions</h2><ul><li><p>What did we agree on?</p></li></ul><h2>Action items</h2><ul><li><p>Action — owner — due date</p></li></ul>",
  },
];

export type DocumentTemplate = (typeof documentTemplates)[number];

function TemplatePreview({ id }: { id: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute right-3 top-5 h-[104px] w-[70px] xl:right-5 xl:top-6 xl:h-[114px] xl:w-[91px] rotate-[6deg] rounded-t-[5px] border border-[#e2e5ee] bg-white px-2.5 pt-3 xl:px-3.5 xl:pt-4 shadow-[0_3px_12px_#1719230a] transition-transform duration-200 group-hover:translate-y-[-4px] group-hover:rotate-[3deg]"
    >
      {id === "blank" ? (
        <span className="flex h-16 items-center justify-center text-[#bdc9f2]">
          <FilePlus2 size={23} strokeWidth={1.25} />
        </span>
      ) : (
        <>
          <span
            className={`mb-3 block h-1.5 w-8 rounded-sm ${id === "brief" ? "bg-[#b4a5e2]" : "bg-[#e1b38e]"}`}
          />
          <span className="mb-2.5 block text-[6px] font-semibold text-[#4f5360]">
            {id === "brief" ? "Project brief" : "Meeting notes"}
          </span>
          <span className="mb-1.5 block h-[3px] w-full rounded-full bg-[#e8eaf0]" />
          <span className="mb-3 block h-[3px] w-4/5 rounded-full bg-[#e8eaf0]" />
          <span className="mb-1.5 flex items-center gap-1.5">
            <span className="h-[4px] w-[4px] rounded-[1px] border border-[#ccd0dc]" />
            <span className="h-[3px] w-8 rounded-full bg-[#e8eaf0]" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[4px] w-[4px] rounded-[1px] border border-[#ccd0dc]" />
            <span className="h-[3px] w-6 rounded-full bg-[#e8eaf0]" />
          </span>
        </>
      )}
    </span>
  );
}

export function DocumentTemplates({
  creating,
  onCreate,
}: {
  creating: string | null;
  onCreate: (template: DocumentTemplate) => void;
}) {
  return (
    <section aria-labelledby="start-writing-title" className="mt-9">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2
          id="start-writing-title"
          className="text-[13px] font-semibold text-[#414653]"
        >
          Start something new
        </h2>
        <span className="hidden text-xs text-[#626977] sm:inline">
          A blank page, or a head start.
        </span>
      </div>
      <div className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {documentTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={creating !== null}
            onClick={() => onCreate(template)}
            className="focus-ring group relative h-[132px] w-[240px] shrink-0 snap-start overflow-hidden sm:h-[150px] sm:w-auto rounded-xl border border-[#e6e8ef] bg-white p-4 text-left sm:p-5 transition-all duration-200 hover:border-[#b4c3f6] hover:shadow-[0_4px_16px_#315bee08] disabled:cursor-wait disabled:opacity-60"
          >
            <span
              className={`mb-2 inline-flex h-7 w-7 sm:mb-4 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${template.color}`}
            >
              {creating === template.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <template.icon className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="relative z-10 block max-w-[calc(100%_-_72px)] sm:max-w-none xl:max-w-[calc(100%_-_80px)]">
              <span className="block text-[13px] font-semibold text-[#242733]">
                {creating === template.id ? "Creating…" : template.title}
              </span>
              <span className="mt-1 block text-[12px] leading-[18px] text-[#626977]">
                {template.id === "blank"
                  ? "A clean slate for your ideas"
                  : template.id === "brief"
                    ? "A clear plan for what’s next"
                    : "Keep the conversation moving"}
              </span>
            </span>
            <span className="sm:hidden xl:block">
              <TemplatePreview id={template.id} />
            </span>
            <ArrowUpRight
              className="absolute right-3 top-3 h-3.5 w-3.5 text-[#adb3c0] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
