"use client";

import { ChangeEvent } from "react";

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void;
}

export default function FileUpload({ onFileLoad }: FileUploadProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(content, file.name);
    };

    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="mb-6">
      <label
        htmlFor="csv-upload"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
      >
        Ladda upp CSV-fil
      </label>
      <input
        id="csv-upload"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-zinc-900 dark:text-zinc-50
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-semibold
                   file:bg-zinc-900 file:text-zinc-50
                   dark:file:bg-zinc-50 dark:file:text-zinc-900
                   hover:file:bg-zinc-700 dark:hover:file:bg-zinc-200
                   file:cursor-pointer cursor-pointer"
      />
    </div>
  );
}
