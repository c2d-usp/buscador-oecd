import { useState } from 'react';
import api from '../api'; 

export const useMetrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/metrics', { params });
      setMetrics(response.data || []);
      setError(null);
    } catch (err) {
      setError(err);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, fetchMetrics };
};