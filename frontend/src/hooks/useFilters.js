import { useState, useEffect } from 'react';
import api from '../api'; 

export const useFilters = () => {
  const [filtersData, setFiltersData] = useState({
    type_of_approach: [],
    programming_languages: [],
    technology_platforms: [],
    maturity: [],
    lifecycle_stages: [],
    target_sectors: [],
    target_users: [],
    geographical_scope: [],
    objectives: [],
    tool_types: [] // NOVO: campo para tipos de ferramenta
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const response = await api.get('/filters');
        const data = response.data || {};
        
        const safeSort = (arr) => arr ? [...arr].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })) : [];

        setFiltersData({
          type_of_approach: safeSort(data.type_of_approach),
          programming_languages: ['Todos', ...safeSort(data.programming_languages)],
          technology_platforms: ['Todos', ...safeSort(data.technology_platforms)],
          maturity: ['Todos', ...safeSort(data.maturity)],
          lifecycle_stages: ['Todos', ...safeSort(data.lifecycle_stages)],
          target_sectors: ['Todos', ...safeSort(data.target_sectors)],
          target_users: ['Todos', ...safeSort(data.target_users)],
          geographical_scope: ['Todos', ...safeSort(data.geographical_scope)],
          objectives: ['Todos', ...safeSort(data.objectives)],
          tool_types: ['Todos', ...safeSort(data.tool_types)] // NOVO
        });
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  return { filtersData, loading, error };
};