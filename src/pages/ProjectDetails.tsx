import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, Trash2, Calendar, MapPin, CheckCircle, Users as UsersIcon } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  location: string;
  client: string;
  deadline: string;
  image_url?: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    fetchMembers();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      // Assuming GET /projects/:id returns details
      // The prompt listed GET /projects for list, and PUT /projects/:id for update.
      // Usually GET /projects/:id exists.
      // If not, we might need to filter from list.
      // Let's try GET /projects/:id first.
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
      // Fallback: try list and find
      try {
          const listRes = await api.get('/projects');
          const found = listRes.data.find((p: any) => p.id === id);
          if (found) setProject(found);
      } catch (e) {
          toast.error('Failed to load project details');
      }
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get(`/projects/${id}/members`);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API expects userIds array. We only have email input.
      // We probably need to search user by email first or the API handles email?
      // The prompt says: Input (JSON): { "userIds": ["uuid1", "uuid2"] }
      // This implies we need to select existing users.
      // For now, I'll assume we have a user selection or we need to find user ID by email.
      // Since I don't have a "search users" API endpoint documented for this purpose,
      // I'll assume there might be a way, or I'll just use a mock ID for now if I can't find it?
      // No, I should use the `users` table from Supabase to find the user ID!
      // Yes, I have Supabase client.
      
      const { data: users, error } = await import('../lib/supabase').then(m => m.supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single()
      );

      if (error || !users) {
        toast.error('User not found in system');
        return;
      }

      await api.post(`/projects/${id}/members`, {
        userIds: [users.id]
      });

      toast.success('Member added successfully');
      setInviteEmail('');
      setShowInviteModal(false);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (error: any) {
      toast.error('Error removing member');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!project) return <div className="p-8 text-center text-gray-400">Project not found</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <p className="text-gray-400">{project.client}</p>
        </div>
        <div className={`ml-auto px-4 py-2 rounded-full text-sm font-medium border border-white/10 ${
            project.status === 'completed' ? 'bg-green-500/20 text-green-300' :
            project.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
            'bg-yellow-500/20 text-yellow-300'
        }`}>
            {project.status.replace('_', ' ')}
        </div>
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10">
            <Calendar className="w-8 h-8 text-blue-400 mb-4" />
            <p className="text-sm text-gray-400">Deadline</p>
            <p className="text-lg font-medium text-white">{new Date(project.deadline).toLocaleDateString()}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10">
            <MapPin className="w-8 h-8 text-purple-400 mb-4" />
            <p className="text-sm text-gray-400">Location</p>
            <p className="text-lg font-medium text-white">{project.location}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10">
            <UsersIcon className="w-8 h-8 text-green-400 mb-4" />
            <p className="text-sm text-gray-400">Team Size</p>
            <p className="text-lg font-medium text-white">{members.length} Members</p>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-gray-400" />
                Team Members
            </h2>
            {(role === 'admin' || role === 'owner') && (
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                </button>
            )}
        </div>
        
        <div className="divide-y divide-white/10">
            {members.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No members assigned yet</div>
            ) : (
                members.map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold border border-white/10">
                                {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    (member.name || member.email).charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <p className="text-white font-medium">{member.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-400">{member.email}</p>
                            </div>
                        </div>
                        {(role === 'admin' || role === 'owner') && (
                            <button 
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] rounded-2xl border border-white/10 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-4">Add Team Member</h3>
                <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">User Email</label>
                        <input 
                            type="email" 
                            required
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            placeholder="user@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">User must already exist in the system.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
