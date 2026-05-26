import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Folder, Calendar, MapPin, Users as UsersIcon, MoreVertical, Edit2, Trash2, X, Image as ImageIcon, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'upcoming' | 'in_progress' | 'completed';
  location: string;
  client: string;
  deadline: string;
  image_url?: string;
  company_id?: string;
  members_count?: number;
}

interface CompanyWithProjects {
  id: string;
  name: string;
  projects: Project[];
}

const Projects = () => {
  const { role, session } = useAuth();
  const navigate = useNavigate();
  const [companyProjects, setCompanyProjects] = useState<CompanyWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as Project['status'],
    location: '',
    client: '',
    deadline: '',
    image_url: '',
    company_id: ''
  });

  useEffect(() => {
    if (session) {
      console.log('Projects page mounted with session:', session.user.id);
      fetchProjects();
      fetchCompanies();
    } else {
      console.warn('Projects page mounted without session');
    }
  }, [session]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*');
      
      if (error) throw error;
      setCompanies(data || []);
      // Set default company if only one exists
      if (data && data.length === 1) {
        setSelectedCompanyId(data[0].id);
        setFormData(prev => ({ ...prev, company_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('Fetching projects...');
      // Updated endpoint as per user request
      const response = await api.get('/projects/list');
      console.log('Projects response:', response.data);
      
      // Handle nested projects structure from owner/admin view
      let companiesData: CompanyWithProjects[] = [];
      
      // The API response is an array of objects which contain a 'projects' array
      if (Array.isArray(response.data)) {
        // Check if the items contain a 'projects' array (Owner view structure)
        const hasNestedProjects = response.data.some((item: any) => item && Array.isArray(item.projects));
        
        if (hasNestedProjects) {
          // This IS the company list with projects
          companiesData = response.data.map((item: any) => ({
            id: item.id,
            name: item.name || 'Unknown Company',
            projects: item.projects || []
          }));
        } else {
          // It's a flat list of projects (maybe for a specific user/role)
          // Group them into a dummy "All Projects" company or handle differently
          // For now, let's wrap them in a single group
          companiesData = [{
            id: 'all',
            name: 'All Projects',
            projects: response.data
          }];
        }
      } else {
        // Handle wrapped response (e.g. { data: [...] })
        const data = response.data?.data || [];
        companiesData = [{
          id: 'all',
          name: 'Projects',
          projects: Array.isArray(data) ? data : []
        }];
      }
      
      console.log('Processed company projects data:', companiesData);
      setCompanyProjects(companiesData);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      toast.error(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.client || !formData.deadline || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    // For admins/owners, require company selection
    if ((role === 'admin' || role === 'owner') && !formData.company_id) {
      toast.error('Please select a company');
      return;
    }

    try {
      setLoading(true);
      
      let imageUrl = null;
      
      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(filePath, imageFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('project-images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        location: formData.location,
        client: formData.client,
        deadline: formData.deadline,
        image: imageUrl, // Use 'image' field as per API spec
        company_id: formData.company_id
      };
      
      console.log('Creating project with payload:', payload);

      await api.post('/projects', payload);
      
      toast.success('Project created successfully');
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        status: 'in_progress',
        location: '',
        client: '',
        deadline: '',
        image_url: '',
        company_id: ''
      });
      setImageFile(null);
      setImagePreview(null);
      fetchProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      setLoading(true);
      
      let imageUrl = formData.image_url;
      
      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(filePath, imageFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('project-images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        location: formData.location,
        client: formData.client,
        deadline: formData.deadline,
        image: imageUrl // Use 'image' field as per API spec, though local state uses image_url
      };

      await api.put(`/projects/${editingProject.id}`, payload);
      
      toast.success('Project updated successfully');
      setShowModal(false);
      setEditingProject(null);
      setImageFile(null);
      setImagePreview(null);
      fetchProjects();
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error(error.response?.data?.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      setLoading(true);
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.message || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      status: 'in_progress',
      location: '',
      client: '',
      deadline: '',
      image_url: '',
      company_id: ''
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      location: project.location,
      client: project.client,
      deadline: project.deadline.split('T')[0], // Format for date input
      image_url: project.image_url || '',
      company_id: project.company_id || ''
    });
    setImagePreview(project.image_url || null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-400">Manage your projects and their status</p>
        </div>
        {(role === 'admin' || role === 'owner') && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading projects...</div>
      ) : companyProjects.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
          <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No Projects Found</h3>
          <p className="text-gray-400">Get started by creating your first project.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {companyProjects.map((company) => (
            company.projects.length > 0 && (
              <div key={company.id} className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <Building className="w-5 h-5 text-purple-400" />
                  {company.name}
                  <span className="text-xs font-normal text-gray-400 ml-2 bg-white/5 px-2 py-0.5 rounded-full">
                    {company.projects.length} Projects
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {company.projects.map((project) => (
                    <div key={project.id} className="group bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/10">
                      <div className="h-48 bg-gray-800 relative overflow-hidden">
                        {project.image_url ? (
                          <img src={project.image_url} alt={project.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <Folder className="w-12 h-12 text-gray-700" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border border-white/10 ${
                            project.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                            project.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {project.status ? project.status.replace('_', ' ') : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{project.name}</h3>
                            <p className="text-sm text-gray-400">{project.client}</p>
                          </div>
                          {(role === 'admin' || role === 'owner') && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => openEdit(project)} 
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                title="Edit Project"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(project.id)} 
                                className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete Project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                          {project.description || 'No description provided'}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {project.location}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                          </div>
                        </div>

                        {project.members_count !== undefined && (
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-gray-400 text-sm">
                            <UsersIcon className="w-4 h-4 text-gray-500" />
                            {project.members_count} Members
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1A1F2C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#1A1F2C] z-10">
              <h2 className="text-xl font-bold text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button 
                onClick={handleModalClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editingProject ? handleUpdate : handleCreate} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Company Selection */}
                {(role === 'admin' || role === 'owner') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                      required
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({...formData, client: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 min-h-[100px]"
                    placeholder="Enter project description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="active">Active</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Project location"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Project Image</label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        id="project-image"
                      />
                      <label 
                        htmlFor="project-image"
                        className="w-full bg-black/20 border border-white/10 border-dashed rounded-xl px-4 py-2.5 text-gray-400 hover:text-white hover:border-blue-500/50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {imageFile ? imageFile.name : 'Upload Image'}
                      </label>
                    </div>
                  </div>
                </div>

                {imagePreview && (
                  <div className="mt-4 relative w-full h-48 rounded-xl overflow-hidden border border-white/10">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500/50 rounded-full text-white transition-colors backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
