const API = import.meta.env.VITE_API_URL || 'https://empty-bags-software.onrender.com/api';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${API}${path.startsWith('/') ? path : '/' + path}`;
  const headers = { 
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...opts.headers 
  };

  const method = (opts.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
    headers,
  });

  if (opts.raw) return res;
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let errorMsg = data.error || data.detail;
    if (!errorMsg && typeof data === 'object' && Object.keys(data).length > 0) {
      errorMsg = Object.entries(data)
        .map(([field, msgs]) => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
          const msgStr = Array.isArray(msgs) ? msgs.join(', ') : msgs;
          return `${fieldName}: ${msgStr}`;
        })
        .join(' | ');
    }
    if (!errorMsg) errorMsg = 'API Request Failed';
    throw new Error(errorMsg);
  }
  return data;
}

export const login = (u, p) => {
  let username = u;
  let password = p;
  if (typeof u === 'object' && u !== null) {
    username = u.username;
    password = u.password;
  }
  return api('/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
};

export const logout = () =>
  api('/auth/logout/', { method: 'POST', headers: { 'Content-Type': 'application/json' } });

export const getUsers = () => api('/users/');
export const createUser = (d) =>
  api('/users/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const updateUser = (id, d) =>
  api(`/users/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const deleteUser = (id) => api(`/users/${id}/`, { method: 'DELETE' });

export const getPlaces = () => api('/places/');
export const createPlace = (d) =>
  api('/places/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const updatePlace = (id, d) =>
  api(`/places/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const deletePlace = (id) => api(`/places/${id}/`, { method: 'DELETE' });

export const getParties = () => api('/parties/');
export const createParty = (d) =>
  api('/parties/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const updateParty = (id, d) =>
  api(`/parties/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const deleteParty = (id) => api(`/parties/${id}/`, { method: 'DELETE' });

export const getVarieties = () => api('/varieties/');
export const createVariety = (formData) =>
  api('/varieties/', { method: 'POST', body: formData });
export const updateVariety = (id, formData) =>
  api(`/varieties/${id}/`, { method: 'PATCH', body: formData });
export const deleteVariety = (id) => api(`/varieties/${id}/`, { method: 'DELETE' });

export const getInwards = (params) => {
  if (typeof params === 'string') return api(params);
  const q = new URLSearchParams();
  if (params?.all) q.set('all', params.all);
  if (params?.date) q.set('date', params.date);
  return api(`/inward/?${q.toString()}`);
};
export const createInward = (d) =>
  api('/inward/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const updateInward = (id, d) =>
  api(`/inward/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const deleteInward = (id) =>
  api(`/inward/${id}/`, { method: 'DELETE' });

export const getOutwards = (params) => {
  if (typeof params === 'string') return api(params);
  const q = new URLSearchParams();
  if (params?.all) q.set('all', params.all);
  if (params?.date) q.set('date', params.date);
  return api(`/outward/?${q.toString()}`);
};
export const createOutward = (d) =>
  api('/outward/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const updateOutward = (id, d) =>
  api(`/outward/${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const deleteOutward = (id) =>
  api(`/outward/${id}/`, { method: 'DELETE' });

export const getAlerts = () => api('/alerts/');

export const getLedger = (params = {}) => {
  const q = new URLSearchParams();
  if (params.variety_id) q.set('variety_id', params.variety_id);
  if (params.invoice_no) q.set('invoice_no', params.invoice_no);
  if (params.start_date) q.set('start_date', params.start_date);
  if (params.end_date) q.set('end_date', params.end_date);
  if (params.month) q.set('month', params.month);
  if (params.page) q.set('page', params.page);
  if (params.page_size) q.set('page_size', params.page_size);
  return api(`/empty-bags-ledger/?${q.toString()}`);
};

export const downloadPdf = (type, id) => {
  window.open(`${API}/${type}/${id}/pdf/`, '_blank');
};

export const getApprovals = () => api('/approvals/');
export const createApprovalRequest = (d) =>
  api('/approvals/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
export const approveRequest = (id) =>
  api(`/approvals/${id}/approve/`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
export const rejectRequest = (id) =>
  api(`/approvals/${id}/reject/`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
