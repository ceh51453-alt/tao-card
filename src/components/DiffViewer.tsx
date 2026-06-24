import { diffWordsWithSpace } from 'diff';

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

export function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const diff = diffWordsWithSpace(oldText || '', newText || '');

  return (
    <div className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap p-2 bg-muted/30 rounded-md border border-border max-h-40 overflow-y-auto scrollbar-thin">
      {diff.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="bg-destructive/20 text-destructive line-through opacity-70 rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-muted-foreground">{part.value}</span>;
      })}
    </div>
  );
}
