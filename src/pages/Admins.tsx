import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, ShieldPlus, Search, ShieldOff, Check, X, UserPlus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  name?: string;
  avatar?: string;
}

interface AdminRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  company_name: string;
  company_details?: {
    phone?: string;
    address?: string;
    website?: string;
  };
  created_at?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string;
    company_id: string | null;
    created_at: string;
    updated_at: string;
    company?: {
      id: string;
      name: string;
      details: any;
    };
  };
}

const Admins = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'admins' | 'requests'>('admins');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
    fetchRequests();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin') // Changed from 'owner' to 'admin' as requested
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      toast.error('Error fetching admins: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      console.log('Listing Admin Requests as Owner...');
      const response = await api.get('/admin-requests/requests');
      console.log('Admin Requests Response:', response.data);
      setRequests(response.data || []);
    } catch (error: any) {
      console.error('Error fetching admin requests:', error);
      // Only show toast on error, not on 404/empty
      if (error.response?.status !== 404) {
        toast.error('Failed to load admin requests');
      }
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (request: AdminRequest) => {
    try {
      console.log('Approving Admin Request as Owner...');
      await api.put(`/admin-requests/requests/${request.id}/approve`);
      toast.success('Request approved successfully');
      fetchRequests();
      fetchAdmins(); // Refresh admins list as a new admin might be added
    } catch (error: any) {
      console.error('Error approving request:', error);
      const errorData = error.response?.data;
      const errorText = `${errorData?.message || ''} ${errorData?.details || ''}`.toLowerCase();
      const isDuplicateMembership = errorData?.code === '23505' || errorText.includes('duplicate key value');

      if (isDuplicateMembership) {
        let companyId = request.user.company_id || null;

        if (!companyId) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: request.company_name || request.user.name || request.user.email || 'New Company',
              details: request.company_details || {
                phone: '',
                address: request.user.email || '',
                website: ''
              },
              admin_id: request.user.id,
              created_by: request.user.id
            })
            .select('id')
            .single();

          if (companyError) {
            toast.error(companyError.message || 'Failed to create company');
            return;
          }

          companyId = companyData.id;
        }

        const { error: memberError } = await supabase
          .from('company_members')
          .upsert(
            {
              company_id: companyId,
              user_id: request.user.id,
              role: 'admin'
            },
            { onConflict: 'company_id,user_id' }
          );

        if (memberError) {
          toast.error(memberError.message || 'Failed to approve request');
          return;
        }

        const { error: roleUpdateError } = await supabase
          .from('users')
          .update({ role: 'admin', company_id: companyId })
          .eq('id', request.user.id);

        if (roleUpdateError) {
          toast.error(roleUpdateError.message || 'Failed to approve request');
          return;
        }

        await supabase
          .from('admin_requests')
          .update({ status: 'approved' })
          .eq('id', request.id);

        toast.success('Request approved successfully');
        setRequests(prev => prev.filter(r => r.id !== request.id));
        fetchAdmins();
        return;
      }

      toast.error(errorData?.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return; // Cancelled

    try {
      console.log('Rejecting Admin Request as Owner...');
      await api.put(`/admin-requests/requests/${requestId}/reject`, {
        reason: reason || 'Admin discretion'
      });
      toast.success('Request rejected successfully');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleDemote = async (adminId: string) => {
    if (!window.confirm('Are you sure you want to remove admin privileges from this user?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', adminId);

      if (error) throw error;
      setAdmins(admins.filter(admin => admin.id !== adminId));
      toast.success('Admin privileges removed successfully');
    } catch (error: any) {
      toast.error('Error updating role: ' + error.message);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      const { error } = await supabase.from('users').delete().eq('id', adminId);
      if (error) throw error;
      setAdmins(admins.filter(admin => admin.id !== adminId));
      toast.success('Admin deleted successfully');
    } catch (error: any) {
      toast.error('Error deleting admin: ' + error.message);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldPlus className="w-6 h-6 text-purple-400" />
          Admin Management
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'admins' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
          >
            Admins
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'admins' ? (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-lg border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => navigate('/users')}
              className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admin User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading admins...</td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No admins found</td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center text-white font-medium border border-white/10 overflow-hidden">
                             <img 
                                src={admin.avatar || `https://ui-avatars.com/api/?name=${admin.name || admin.email}&background=random&color=7e22ce&background=f3e8ff`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                              />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{admin.name || 'No Name'}</div>
                            <div className="text-sm text-gray-400">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDemote(admin.id)}
                            className="p-2 hover:bg-orange-500/10 rounded-lg text-orange-400 transition-colors"
                            title="Remove Admin Privileges"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(admin.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-lg border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-medium text-white">Pending Admin Requests</h2>
            <p className="text-sm text-gray-400">Review and approve requests for admin access</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Requested At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {requestsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading requests...</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No pending requests found</td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                            {request.user?.avatar ? (
                              <img src={request.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              (request.user?.name || request.user?.email || '?').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{request.user?.name || 'No Name'}</div>
                            <div className="text-sm text-gray-400">{request.user?.email || 'No Email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {request.company_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20">
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApproveRequest(request)}
                            className="p-2 hover:bg-green-500/10 rounded-lg text-green-400 transition-colors"
                            title="Approve Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(request.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
