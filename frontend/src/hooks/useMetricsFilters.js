import { useState, useEffect } from 'react';
import api from '../api'; 

export const useMetricsFilters = () => {
  const [filtersData, setFiltersData] = useState({
    metric_types: [],
    objectives: [],
    purposes: [],
    target_users: [],
    target_sectors: [],
    lifecycle_stages: [],
    usage_rights: [],
    risk_management_stage: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const response = await api.get('/metrics/filters');
        const data = response.data || {};

        const safeSort = (arr) =>
          arr
            ? [...arr].sort((a, b) =>
                String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })
              )
            : [];

        setFiltersData({
          metric_types: ['Todos', ...safeSort(data.metric_types)],
          objectives: ['Todos', ...safeSort(data.objectives)],
          purposes: ['Todos', ...safeSort(data.purposes)],
          target_users: ['Todos', ...safeSort(data.target_users)],
          target_sectors: ['Todos', ...safeSort(data.target_sectors)],
          lifecycle_stages: ['Todos', ...safeSort(data.lifecycle_stages)],
          usage_rights: ['Todos', ...safeSort(data.usage_rights)],
          risk_management_stage: ['Todos', ...safeSort(data.risk_management_stage)],
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