"use client";

import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileDropZoneProps {
  onFilesProcessed: (files: File[]) => void;
}

export default function FileDropZone({ onFilesProcessed }: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...files]);
      onFilesProcessed(files);
    }
  }, [onFilesProcessed]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
      onFilesProcessed(files);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
        multiple
        accept=".csv,.html,.xlsx"
      />
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 bg-slate-900/20",
          isDragActive ? "border-nautilus-accent bg-nautilus-accent/5 scale-[1.02]" : "border-slate-700 hover:border-slate-500"
        )}
      >
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          isDragActive ? "bg-nautilus-accent text-nautilus-dark animate-pulse" : "bg-slate-800 text-slate-400"
        )}>
          <Upload size={32} />
        </div>
        
        <div className="text-center">
          <p className="text-xl font-bold text-white mb-1">Arraste seus relatórios aqui</p>
          <p className="text-slate-400 text-sm">MT5 (.csv, .html), SQX (.xlsx, .html) ou QuantAnalyzer (.csv)</p>
        </div>

        <div className="mt-4">
          <button 
            type="button"
            onClick={onButtonClick}
            className="btn-primary"
          >
            Selecionar Arquivos
          </button>
        </div>

        {/* Backdrop Glow */}
        <div className="absolute -z-10 inset-0 bg-nautilus-accent/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-3"
          >
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-2">Arquivos na Fila</h3>
            {uploadedFiles.map((file, i) => (
              <motion.div 
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-4 flex items-center justify-between border-slate-800/50 hover:border-nautilus-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-nautilus-accent">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="text-nautilus-success">
                  <CheckCircle size={18} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
