import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { FileText, Check, X, ExternalLink } from 'lucide-react';

type Document = {
  documentId: string;
  userId: string;
  docType: string;
  fileUrl: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/documents')
      .then(res => {
        setDocuments(res.data.data.items);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleReview = (docId: string, status: 'APPROVED' | 'REJECTED') => {
    const reason = status === 'REJECTED' ? prompt('Reason for rejection:') : null;
    if (status === 'REJECTED' && reason === null) return;

    client.patch(`/admin/documents/${docId}/review`, { status, rejection_reason: reason })
      .then(() => {
        setDocuments(documents.filter(d => d.documentId !== docId));
      });
  };

  if (isLoading) return <div>Loading pending documents...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Document Verification</h1>
        <p className="text-gray-500">Review and verify haulier compliance documents.</p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-100">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">No pending documents for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.documentId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-amber/10 text-amber text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {doc.docType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-navy mb-1 truncate">Document ID: {doc.documentId.slice(-8)}</h3>
                <p className="text-sm text-gray-500 mb-4">User ID: {doc.userId}</p>
                
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold hover:underline"
                >
                  View Document <ExternalLink size={14} />
                </a>
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => handleReview(doc.documentId, 'REJECTED')}
                  className="flex-1 bg-white border border-red-100 text-red-600 font-bold py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} /> Reject
                </button>
                <button 
                  onClick={() => handleReview(doc.documentId, 'APPROVED')}
                  className="flex-1 bg-navy text-white font-bold py-2 rounded-lg hover:bg-navy/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Check size={16} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
