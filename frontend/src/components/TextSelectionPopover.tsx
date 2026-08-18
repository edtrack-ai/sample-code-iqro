import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface TextSelectionPopoverProps {
  containerRef: React.RefObject<HTMLElement>;
  onAskAI: (selectedText: string) => void;
}

export function TextSelectionPopover({ containerRef, onAskAI }: TextSelectionPopoverProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setShow(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setShow(false);
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setShow(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPosition({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top + containerRef.current.scrollTop - 8,
    });
    setSelectedText(text);
    setShow(true);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  const handleClick = () => {
    onAskAI(selectedText);
    setShow(false);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 -translate-x-1/2"
          style={{ left: position.x, top: position.y }}
        >
          <button
            onClick={handleClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI about this
          </button>
          <div className="w-2 h-2 bg-primary rotate-45 mx-auto -mt-1" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
