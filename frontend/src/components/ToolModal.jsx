import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { getActivityStatus } from '../utils/helpers';

const ToolModal = ({ tool, onClose }) => {
  if (!tool) return null;

  const status = getActivityStatus(tool.github_last_push);

  const renderField = (label, key, isHtml = false, isLink = false) => {
    const value = tool[key];
    if (!value || value === 'N/A') return null;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </h3>
        {isHtml ? (
          <div
            className="prose prose-slate max-w-none text-slate-700 dark:prose-invert dark:text-slate-200
              [&_*]:!text-inherit
              [&_a]:!text-indigo-600 dark:[&_a]:!text-indigo-400
              [&_a:hover]:!underline
              [&_p]:mb-6 [&_p]:leading-[1.5]
              [&_ul]:list-none [&_ul]:pl-0 [&_ul]:mb-6 [&_ul]:-mt-4
              [&_ul_ul]:mt-2 [&_ul_ul]:pl-6 [&_ul_ul]:mb-0
              [&_li]:relative [&_li]:pl-5 [&_li]:mb-1 [&_li]:leading-[1.5]
              [&_li:before]:content-['›'] [&_li:before]:absolute [&_li:before]:left-0
              [&_li:before]:text-indigo-600 dark:[&_li:before]:!text-indigo-400
              [&_li:before]:text-[35px] [&_li:before]:leading-none [&_li:before]:top-[-8px]
              [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:mt-6 [&_h3]:mb-3
              [&_strong]:text-inherit [&_em]:text-inherit [&_code]:text-inherit"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline break-all dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap dark:text-slate-300">
            {value}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/55 backdrop-blur-md dark:bg-slate-950/80">
      {/* Botão de Fechar FIXO na tela */}
      <button
        onClick={onClose}
        className="fixed right-5 top-5 z-[60] flex items-center justify-center rounded-2xl bg-slate-900/50 p-3 text-white backdrop-blur-md transition hover:bg-slate-900/80 shadow-lg dark:bg-slate-800/50 dark:hover:bg-slate-800/80"
      >
        <X size={20} />
      </button>

      {/* Container Unificado com Scroll Customizado */}
      <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-900 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-indigo-400 hover:[&::-webkit-scrollbar-thumb]:bg-indigo-500 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Cabeçalho - Agora acompanha o scroll */}
        <div className="relative bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-6 pt-16 md:px-12 md:py-8 md:pt-12 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_white_0,_transparent_30%)] opacity-20" />

          <div className="relative pr-12 md:pr-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <Sparkles size={14} />
              Detalhes da ferramenta
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-white md:text-4xl">
                {tool.title}
              </h2>
              {status && (
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${status.color} shadow-sm`}
                  title={status.label}
                />
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-300 md:text-base dark:text-slate-400">
              Informações completas organizadas para leitura rápida.
            </p>
          </div>
        </div>

        {/* Restante do Conteúdo */}
        <div className="px-6 py-8 md:px-12 shadow-inner">
          <div className="mx-auto max-w-7xl">
            {/* Renderização apenas da primeira imagem */}
            {tool.media_links && tool.media_links !== 'N/A' && (
              <div className="mb-6 flex gap-4 pb-2">
                <img
                  src={tool.media_links.split(',')[0].trim()}
                  alt="Mídia Principal"
                  className="max-h-80 w-auto shrink-0 rounded-xl border border-slate-200 bg-white object-scale-down object-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Todas as informações */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                {renderField('Sobre / Texto Completo', 'total_text', true)}
              </div>
              <div className="md:col-span-2">
                {renderField('Resumo', 'about')}
              </div>
              {renderField('Tipos de Ferramenta', 'tool_types')}
              {renderField('Organizações Desenvolvedoras', 'developing_organisations')}
              {renderField('Pessoas Envolvidas', 'people_involved')}
              {renderField('Grupos de Partes Interessadas', 'stakeholder_group')}
              {renderField('Setores Alvo', 'target_sectors')}
              {renderField('Grupos Alvo', 'target_groups')}
              {renderField('Usuários Alvo', 'target_users')}
              {renderField('Objetivos', 'objectives')}
              {renderField('Propósitos', 'purposes')}
              {renderField('Benefícios', 'benefits')}
              {renderField('Estágios do Ciclo de Vida', 'lifecycle_stages')}
              {renderField('Maturidade', 'maturity')}
              {renderField('Escopo Geográfico', 'geographical_scope')}
              {renderField('Linguagens de Programação', 'programming_languages')}
              {renderField('Plataformas Tecnológicas', 'technology_platforms')}
              {renderField('Direitos de Uso', 'usage_rights')}
              <div className="md:col-span-2">
                {renderField('Tags', 'tags')}
              </div>

              {renderField('Link', 'link', false, true)}
              {renderField('GitHub', 'github_link', false, true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolModal;