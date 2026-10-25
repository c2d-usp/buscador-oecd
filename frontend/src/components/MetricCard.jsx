import React from 'react';
import { Grid3X3, ChevronRight, BarChart3, Settings } from 'lucide-react';
import { getActivityStatus, splitValues } from '../utils/helpers';
import SaveButton from './SaveButton';

const MetricCard = ({ metric, onClick, allItems }) => {
  const status = getActivityStatus(metric.github_last_push);

  const formatTypes = (typeValue) => {
    const values = splitValues(typeValue);
    if (values.length === 0) return 'N/A';
    return values
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      .join(' / ');
  };

  const formattedType = formatTypes(metric.metric_types);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-orange-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-900/10 dark:border-orange-700 dark:bg-slate-800">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white"
              title={metric.title}
            >
              {metric.title}
            </h3>
            {status && (
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.color}`}
                title={status.label}
              />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
              <Grid3X3 size={13} className="shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {!metric.local || metric.local === 'N/A' ? (
                  <span>N/A</span>
                ) : (
                  metric.local.split(',').map((name, index, array) => {
                    const links = metric.local_links ? metric.local_links.split(',') : [];
                    const url = links[index]?.trim();
                    const hasValidLink = url && url !== 'N/A';
                    return (
                      <React.Fragment key={index}>
                        <a
                          href={hasValidLink ? url : undefined}
                          target={hasValidLink ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => !hasValidLink && e.preventDefault()}
                          className={`transition-colors ${
                            hasValidLink
                              ? 'hover:text-orange-600 hover:underline cursor-pointer dark:hover:text-orange-400'
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
                  })
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <BarChart3 size={13} />
              {metric.relevance || 'N/A'}
            </span>
            {formattedType !== 'N/A' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
                <Settings size={13} />
                {formattedType}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {metric.about && metric.about !== 'N/A' ? metric.about : 'Sem descrição disponível.'}
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {metric.objectives &&
          metric.objectives !== 'N/A' &&
          metric.objectives.split(',').slice(0, 3).map((obj, index) => {
            const colors = [
              'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
              'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
              'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
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

      <div className="mt-auto pt-5 flex justify-between items-center">
        <button
          onClick={() => onClick(metric)}
          className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 dark:bg-amber-500 dark:hover:bg-amber-400"
        >
          Ver detalhes
          <ChevronRight size={17} />
        </button>

        <div className="w-10 h-10 shrink-0" />
      </div>

      <SaveButton itemType="metric" itemId={metric.id} allItems={allItems} />
    </article>
  );
};

export default MetricCard;