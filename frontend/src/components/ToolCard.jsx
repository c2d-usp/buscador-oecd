import React from 'react';
import { Calendar, Settings, Grid3X3, ChevronRight } from 'lucide-react';
import { getActivityStatus, splitValues } from '../utils/helpers';
import SaveButton from './SaveButton';

const ToolCard = ({ tool, onClick, allItems }) => {
  const status = getActivityStatus(tool.github_last_push);

  const formatTypes = (typeValue) => {
    const values = splitValues(typeValue);
    if (values.length === 0) return 'N/A';
    return values
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      .join(' / ');
  };

  const formattedTypes = formatTypes(tool.type_of_approach);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white"
              title={tool.title}
            >
              {tool.title}
            </h3>
            {status && (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.color}`}
                title={status.label}
              />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {tool.local && tool.local !== 'N/A' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
                <Grid3X3 size={13} className="shrink-0 text-slate-500 dark:text-slate-400" />
                <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {tool.local.split(',').map((name, index, array) => {
                    const links = tool.local_links ? tool.local_links.split(',') : [];
                    const url = links[index]?.trim();
                    const hasValidLink = url && url !== 'N/A';

                    return (
                      <React.Fragment key={index}>
                        <a
                          href={hasValidLink ? url : undefined}
                          target={hasValidLink ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => !hasValidLink && e.preventDefault()}
                          className={`transition-colors ${
                            hasValidLink 
                              ? 'hover:text-indigo-600 hover:underline cursor-pointer dark:hover:text-indigo-400' 
                              : 'cursor-default opacity-70'
                          }`}
                          title={hasValidLink ? `Abrir ${name.trim()}` : undefined}
                        >
                          {name.trim()}
                        </a>
                        {index < array.length - 1 && (
                          <span className="text-slate-300 select-none dark:text-slate-500">/</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
            
            {tool.date && tool.date !== 'N/A' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
                <Calendar size={13} />
                {tool.date}
              </span>
            )}
            
            {formattedTypes !== 'N/A' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
                <Settings size={13} />
                {formattedTypes}
              </span>
            )}
          </div>
        </div>
      </div>

      {tool.about && tool.about !== 'N/A' && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {tool.about}
        </p>
      )}

      {tool.objectives && tool.objectives !== 'N/A' && (
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {tool.objectives
            .split(',')
            .slice(0, 3)
            .map((obj, index) => {
              const colors = [
                'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
                'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
              ];

              return (
                <span
                  key={index}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${colors[index]}`}
                >
                  {obj.trim()}
                </span>
              );
            })}
        </div>
      )}

      <div className="mt-auto pt-5 flex justify-between items-center">
        <button
          onClick={() => onClick(tool)}
          className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          Ver detalhes
          <ChevronRight size={17} />
        </button>
        
        <div className="w-10 h-10 shrink-0" />
      </div>

      <SaveButton itemType="tool" itemId={tool.id} allItems={allItems} />
    </article>
  );
};

export default ToolCard;