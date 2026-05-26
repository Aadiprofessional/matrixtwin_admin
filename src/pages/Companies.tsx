import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Building2, UserPlus, Check, X, Shield, Mail, MapPin } from 'lucide-react';

const Companies = () => {
  const { user, companyId, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', address: '' });

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
      fetchJoinRequests();
    }
  }, [companyId]);

  const fetchCompanyDetails = async () => {
    // Since there is no direct "get company" endpoint documented for just the company details
    // We might need to rely on what we have or assume GET /api/companies returns list or detail
    // Given the prompt, let's assume we can get details via some endpoint or just display what we have.
    // Actually, "List Projects" lists projects for the company.
    // Let's assume GET /api/companies returns the company for the user if they are owner/admin?
    // Or maybe we just use the create response?
    // Let's try to fetch from /api/companies and see if it returns a list.
    try {
      // The prompt lists "Create Company" at POST /api/companies/
      // It doesn't explicitly list "Get Company".
      // But usually GET /api/companies would list companies user belongs to.
      // Let's assume GET /api/companies returns an array of companies.
      // We will pick the one matching companyId.
      const response = await api.get('/companies');
      if (response.data && Array.isArray(response.data)) {
        const found = response.data.find((c: any) => c.id === companyId);
        if (found) setCompany(found);
      } else if (response.data && response.data.id === companyId) {
         setCompany(response.data);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (role !== 'owner' && role !== 'admin') return;
    try {
      const response = await api.get('/companies/requests');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'owner') {
        toast.error('Only owners can create companies');
        return;
    }
    setLoading(true);
    try {
      const response = await api.post('/companies', {
        name: createForm.name,
        details: { address: createForm.address }
      });
      toast.success('Company created successfully');
      setCompany(response.data.company);
      // We might need to refresh the page or context to update companyId
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating company');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/companies/invite', { email: inviteEmail });
      toast.success('Invitation sent');
      setInviteEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/companies/requests/${id}/${status === 'approved' ? 'approve' : 'reject'}`, { status });
      toast.success(`Request ${status}`);
      fetchJoinRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Error ${status} request`);
    }
  };

  if (!companyId) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Create Your Company</h2>
          <p className="text-gray-400">Get started by setting up your company profile</p>
        </div>

        <form onSubmit={handleCreateCompany} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Matrix AI Global"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Address (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                placeholder="123 Innovation Dr, Tech City"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Company'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Company Header */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-white/10">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{company?.name || 'My Company'}</h1>
            <p className="text-gray-400 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {company?.details?.address || 'No address provided'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
                Code: {company?.code || 'N/A'}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invite Users */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Invite Members
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                placeholder="colleague@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Send Invitation
            </button>
          </form>
        </div>

        {/* Join Requests */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Join Requests
          </h3>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending requests</p>
            ) : (
              requests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                  <div>
                    <p className="text-white font-medium">{req.user?.name || req.user?.email || 'Unknown User'}</p>
                    <p className="text-sm text-gray-400">{req.user?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequest(req.id, 'approved')}
                      className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRequest(req.id, 'rejected')}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Companies;
