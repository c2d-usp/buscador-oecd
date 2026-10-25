import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, accent = 'indigo' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage);

  useEffect(() => {
    setInputValue(currentPage);
  }, [currentPage]);

  const goToFirstPage = () => onPageChange(1);
  const goToPrevPage = () => onPageChange(currentPage - 1);
  const goToNextPage = () => onPageChange(currentPage + 1);
  const goToLastPage = () => onPageChange(totalPages);

  const handlePageClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    submitPage();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      submitPage();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(currentPage);
    }
  };

  const submitPage = () => {
    const newPage = parseInt(inputValue, 10);
    if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    } else {
      setInputValue(currentPage);
    }
    setIsEditing(false);
  };

  // Classes dinâmicas baseadas no accent
  const inputBorder = accent === 'orange'
    ? 'border-orange-300 dark:border-orange-700'
    : 'border-indigo-300 dark:border-indigo-700';
  const inputBg = accent === 'orange'
    ? 'bg-orange-50 dark:bg-orange-950'
    : 'bg-indigo-50 dark:bg-indigo-950';
  const inputFocus = accent === 'orange'
    ? 'focus:border-orange-500 focus:ring-orange-500'
    : 'focus:border-indigo-500 focus:ring-indigo-500';
  const hoverColor = accent === 'orange'
    ? 'hover:text-orange-600 dark:hover:text-orange-400'
    : 'hover:text-indigo-600 dark:hover:text-indigo-400';

  return (
    <div className="mt-8 flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={goToFirstPage}
        disabled={currentPage === 1}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Primeira página"
        title="Primeira página"
      >
        <ChevronsLeft size={18} />
      </button>
      
      <button
        onClick={goToPrevPage}
        disabled={currentPage === 1}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Página anterior"
        title="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="min-w-[110px] px-4 text-center text-sm font-semibold text-slate-900 flex items-center justify-center gap-1 dark:text-slate-200">
        {isEditing ? (
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-12 rounded border px-1 py-0.5 text-center text-sm outline-none focus:ring-1 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBorder} ${inputBg} ${inputFocus}`}
          />
        ) : (
          <span
            onClick={handlePageClick}
            className={`cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${hoverColor}`}
            title="Clique para digitar a página"
          >
            {currentPage}
          </span>
        )}
        <span className="select-none">/</span>
        <span className="select-none">{totalPages}</span>
      </div>

      <button
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Próxima página"
        title="Próxima página"
      >
        <ChevronRight size={18} />
      </button>
      
      <button
        onClick={goToLastPage}
        disabled={currentPage === totalPages}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Última página"
        title="Última página"
      >
        <ChevronsRight size={18} />
      </button>
    </div>
  );
};

export default Pagination;