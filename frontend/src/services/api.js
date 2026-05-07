import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
});

export const getPlants      = ()        => api.get('/plants');
export const getParts       = (params)  => api.get('/parts', { params });
export const getPartById    = (id)      => api.get(`/parts/${id}`);
export const updatePart     = (id, d)   => api.put(`/parts/${id}`, d);
export const getOperations  = (id)      => api.get(`/parts/${id}/operations`);
export const getOperationMaster = (params) => api.get('/operations', { params });
export const updateOperation = (partId, operationId, d) => api.put(`/parts/${partId}/operations/${operationId}`, d);
export const deleteOperation = (partId, operationId) => api.delete(`/parts/${partId}/operations/${operationId}`);
export const getSheets      = (id)      => api.get(`/parts/${id}/sheets`);
export const uploadSheet    = (id, type, d) => api.post(`/parts/${id}/sheets/${type}`, d);
export const getConfig      = (id)      => api.get(`/parts/${id}/configuration`);
export const updateConfig   = (id, d)   => api.put(`/parts/${id}/configuration`, d);
export const getStats       = (params)  => api.get('/stats', { params });
export const getMachines    = ()        => api.get('/machines');
export const getMachineStatusHistory = (id) => api.get(`/machines/${id}/status-history`);

export default api;