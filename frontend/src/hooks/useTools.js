import { useState } from 'react';
import api from '../api'; 

export const useTools = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTools = async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/tools', { params });
      setTools(response.data || []);
      setError(null);
    } catch (err) {
      setError(err);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  return { tools, loading, error, fetchTools };
};
