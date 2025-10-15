"use client";
import { useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface GeneratedLinkModalProps {
  title: string;
  url: string;
  onClose: () => void;
  onCopy: () => void;
  onOpen: () => void;
}

export function GeneratedLinkModal({
  title,
  url,
  onClose,
  onCopy,
  onOpen,
}: GeneratedLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Your onramp URL has been generated successfully. You can copy it
              or open it directly.
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border">
              <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                {url}
              </code>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleCopy}
              variant="outline"
              icon={
                copied ? (
                  <Icon name="check" size="sm" />
                ) : (
                  <span className="text-sm">📋</span>
                )
              }
            >
              {copied ? "Copied!" : "Copy URL"}
            </Button>

            <Button
              onClick={onOpen}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              Open URL
            </Button>

            <Button onClick={onClose} variant="ghost">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeneratedLinkModal;
