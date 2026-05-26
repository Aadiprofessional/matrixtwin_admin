import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Upload, FileText, ChevronLeft, Edit2, Save, X, RefreshCw, Trash2,
  Search, Loader2, CheckCircle, Clock, AlertCircle, FileImage, Plus,
  Layers, Zap, Eye,
} from 'lucide-react';

const KB = '/knowledge-base';

interface KBFile {
  id: string;
  filename: string;
  original_name?: string;
  file_type?: string;
  processing_mode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count?: number;
  created_at: string;
  size?: number;
}

interface KBChunk {
  id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
}

const KnowledgeBase = () => {
  // Files state
  const [files, setFiles] = useState<KBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected file & chunks
  const [selectedFile, setSelectedFile] = useState<KBFile | null>(null);
  const [chunks, setChunks] = useState<KBChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  // Chunk editing
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingChunkId, setSavingChunkId] = useState<string | null>(null);
  const [embeddingChunkId, setEmbeddingChunkId] = useState<string | null>(null);

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [processingMode, setProcessingMode] = useState<'parse' | 'vision'>('parse');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // ── Fetch files ──────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const response = await api.get(`${KB}/files`, { params });
      const data = response.data;
      if (Array.isArray(data)) {
        setFiles(data);
        setTotalPages(1);
      } else {
        setFiles(data.files ?? data.data ?? []);
        setTotalPages(data.total_pages ?? data.pages ?? 1);
      }
    } catch {
      toast.error('Failed to load files');
    } finally {
      setFilesLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // ── Fetch chunks ─────────────────────────────────────────────────────────────
  const fetchChunks = async (file: KBFile) => {
    try {
      setChunksLoading(true);
      setChunks([]);
      const response = await api.get(`${KB}/files/${file.id}/chunks`);
      const data = response.data;
      setChunks(Array.isArray(data) ? data : data.chunks ?? []);
    } catch {
      toast.error('Failed to load chunks');
    } finally {
      setChunksLoading(false);
    }
  };

  const handleSelectFile = (file: KBFile) => {
    setSelectedFile(file);
    setEditingChunkId(null);
    fetchChunks(file);
  };

  // ── Upload ───────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      const isImage = uploadFile.type.startsWith('image/');
      const isText = uploadFile.type === 'text/plain';
      if (!isImage && !isText) {
        formData.append('processing_mode', processingMode);
      }
      await api.post(`${KB}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded successfully');
      setShowUpload(false);
      setUploadFile(null);
      setProcessingMode('parse');
      fetchFiles();
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete file ──────────────────────────────────────────────────────────────
  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this file and all its chunks?')) return;
    try {
      setDeletingFileId(fileId);
      await api.delete(`${KB}/files/${fileId}`);
      toast.success('File deleted');
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setChunks([]);
      }
      fetchFiles();
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  // ── Chunk actions ────────────────────────────────────────────────────────────
  const startEditChunk = (chunk: KBChunk) => {
    setEditingChunkId(chunk.id);
    setEditText(chunk.content);
  };

  const cancelEditChunk = () => {
    setEditingChunkId(null);
    setEditText('');
  };

  const saveChunk = async (chunkId: string) => {
    try {
      setSavingChunkId(chunkId);
      await api.put(`${KB}/chunks/${chunkId}`, { content: editText });
      setChunks(prev => prev.map(c => c.id === chunkId ? { ...c, content: editText } : c));
      setEditingChunkId(null);
      toast.success('Chunk saved');
    } catch {
      toast.error('Failed to save chunk');
    } finally {
      setSavingChunkId(null);
    }
  };

  const reEmbedChunk = async (chunkId: string) => {
    try {
      setEmbeddingChunkId(chunkId);
      await api.post(`${KB}/chunks/${chunkId}/re-embed`);
      toast.success('Chunk re-embedded');
    } catch {
      toast.error('Failed to re-embed chunk');
    } finally {
      setEmbeddingChunkId(null);
    }
  };

  const updateAndEmbedChunk = async (chunkId: string) => {
    try {
      setSavingChunkId(chunkId);
      setEmbeddingChunkId(chunkId);
      await api.post(`${KB}/chunks/${chunkId}/update-and-embed`, { content: editText });
      setChunks(prev => prev.map(c => c.id === chunkId ? { ...c, content: editText } : c));
      setEditingChunkId(null);
      toast.success('Chunk updated and re-embedded');
    } catch {
      toast.error('Failed to update and embed chunk');
    } finally {
      setSavingChunkId(null);
      setEmbeddingChunkId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="w-5 h-5 text-gray-400" />;
    if (fileType.includes('image')) return <FileImage className="w-5 h-5 text-purple-400" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (fileType.includes('word') || fileType.includes('docx') || fileType.includes('document'))
      return <FileText className="w-5 h-5 text-blue-400" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" /> Done
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> Processing
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">{status}</span>;
    }
  };

  const filteredFiles = files.filter(f => {
    if (!searchQuery) return true;
    const name = (f.original_name ?? f.filename ?? '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const isDocOrPdf = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain';
    return !isImage && !isText;
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-sm text-gray-400 mt-0.5">Upload documents, browse files, and manage content chunks</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {/* Main split layout */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Files panel ──────────────────────────────────────────────────── */}
        <div
          className={`flex flex-col bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm overflow-hidden transition-all duration-300 ${
            selectedFile ? 'w-80 flex-shrink-0' : 'flex-1'
          }`}
        >
          {/* Filters */}
          <div className="p-4 border-b border-white/10 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['', 'completed', 'processing', 'pending', 'failed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    statusFilter === s
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {filesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No files found</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-3 text-xs text-gray-400 hover:text-white underline underline-offset-2"
                >
                  Upload your first file
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    onClick={() => handleSelectFile(file)}
                    className={`p-4 cursor-pointer hover:bg-white/5 transition-all group ${
                      selectedFile?.id === file.id ? 'bg-white/10 border-l-2 border-white' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">{getFileIcon(file.file_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {file.original_name ?? file.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {getStatusBadge(file.status)}
                          {(file.chunk_count ?? 0) > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {file.chunk_count} chunks
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(file.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={e => handleDeleteFile(e, file.id)}
                        disabled={deletingFileId === file.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Delete file"
                      >
                        {deletingFileId === file.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-white/10 flex items-center justify-between flex-shrink-0">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── Chunks panel ─────────────────────────────────────────────────── */}
        {selectedFile ? (
          <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => { setSelectedFile(null); setChunks([]); setEditingChunkId(null); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {selectedFile.original_name ?? selectedFile.filename}
                </p>
                <p className="text-xs text-gray-400">
                  {chunksLoading ? 'Loading…' : `${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {getStatusBadge(selectedFile.status)}
            </div>

            {/* Chunks */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chunksLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : chunks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Layers className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No chunks available</p>
                  {selectedFile.status !== 'completed' && (
                    <p className="text-xs mt-1 text-gray-600">File is still being processed</p>
                  )}
                </div>
              ) : (
                chunks.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className={`bg-white/5 border rounded-xl overflow-hidden transition-all duration-200 ${
                      editingChunkId === chunk.id ? 'border-white/30 shadow-lg shadow-white/5' : 'border-white/10'
                    }`}
                  >
                    {/* Chunk header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.03]">
                      <span className="text-xs font-semibold text-gray-400 tracking-wide">
                        CHUNK {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {chunk.token_count != null && (
                          <span className="text-xs text-gray-600">{chunk.token_count} tokens</span>
                        )}
                        {editingChunkId !== chunk.id && (
                          <>
                            <button
                              onClick={() => startEditChunk(chunk)}
                              className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                              title="Edit chunk text"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => reEmbedChunk(chunk.id)}
                              disabled={embeddingChunkId === chunk.id}
                              className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                              title="Re-embed with current text"
                            >
                              {embeddingChunkId === chunk.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chunk body */}
                    <div className="p-4">
                      {editingChunkId === chunk.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={8}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-y leading-relaxed"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Save only */}
                            <button
                              onClick={() => saveChunk(chunk.id)}
                              disabled={savingChunkId === chunk.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs rounded-lg transition-all disabled:opacity-50"
                            >
                              {savingChunkId === chunk.id && embeddingChunkId !== chunk.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Save className="w-3.5 h-3.5" />}
                              Save text
                            </button>
                            {/* Save + re-embed */}
                            <button
                              onClick={() => updateAndEmbedChunk(chunk.id)}
                              disabled={savingChunkId === chunk.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs rounded-lg transition-all disabled:opacity-50"
                            >
                              {embeddingChunkId === chunk.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Zap className="w-3.5 h-3.5" />}
                              Save & Re-embed
                            </button>
                            {/* Cancel */}
                            <button
                              onClick={cancelEditChunk}
                              disabled={savingChunkId === chunk.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-xs rounded-lg transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {chunk.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Empty state when no file selected */
          <div className="flex-1 flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="text-center text-gray-600">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a file to view its chunks</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Modal ───────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Upload File</h2>
              <button
                onClick={() => { setShowUpload(false); setUploadFile(null); }}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) setUploadFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-white/50 bg-white/10'
                    : 'border-white/15 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }}
                />
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    {getFileIcon(uploadFile.type)}
                    <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-gray-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-gray-600">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-white">Drop file here or click to browse</p>
                    <p className="text-xs text-gray-500">PDF, DOCX, TXT, PNG, JPG, WEBP</p>
                  </div>
                )}
              </div>

              {/* Processing mode — only for PDF / DOCX */}
              {uploadFile && isDocOrPdf(uploadFile) && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Processing Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['parse', 'vision'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setProcessingMode(mode)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          processingMode === mode
                            ? 'border-white/30 bg-white/10'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {mode === 'parse'
                            ? <FileText className="w-4 h-4 text-blue-400" />
                            : <Eye className="w-4 h-4 text-purple-400" />}
                          <span className="text-xs font-semibold text-white capitalize">{mode}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {mode === 'parse' ? 'Fast text extraction' : 'Page-by-page OCR'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : <><Upload className="w-4 h-4" /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
